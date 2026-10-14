import { normalizeSaraminPage, officialSaraminUrl } from './saramin-normalize.ts'
import { evaluateConditions } from '../pipeline/filter.ts'
import { deduplicateJobs } from '../pipeline/deduplicate.ts'
import type { JobPosting } from '../../src/domain/jobs.ts'
import type { UserProfile } from '../../src/domain/profile.ts'

export interface WindowCheckpoint { from: number; until: number; page: number }
export interface QueueItem {
  jobId: string
  fingerprint: string
  status: 'hold-analysis' | 'needs-review' | 'excluded' | 'sending' | 'sent' | 'delivery-unknown'
}
export interface CollectionState {
  version: 1
  scope: string | null
  checkpoint: WindowCheckpoint | null
  completedUntil: number | null
  jobs: Record<string, JobPosting>
  queue: Record<string, QueueItem>
}
export interface PageCommit {
  version: 1
  scope: string
  checkpoint: WindowCheckpoint | null
  completedUntil: number | null
  jobs: readonly JobPosting[]
  queue: readonly QueueItem[]
}
export interface CollectionConfig {
  enabled: boolean
  approved: boolean
  usageReviewed: boolean
  freeOnly: boolean
  key: string | undefined
  pageSize: number
  maxRequests: number
  keywords: string | undefined
}
// Ports are synchronous because Google's URL Fetch and Sheets are synchronous.
// reserveRequest persists BEFORE each attempt, including retries and failures.
export interface CollectionPorts {
  request(url: string): { status: number; body: string }
  reserveRequest(): boolean
  commit(batch: PageCommit): void
  pause(milliseconds: number): void
}
export const emptyCollectionState = (): CollectionState => ({ version: 1, scope: null, checkpoint: null, completedUntil: null, jobs: {}, queue: {} })

export function parseCollectionProfile(input: unknown): UserProfile {
  if (!input || typeof input !== 'object') throw new TypeError('Invalid conditions')
  const value = input as Record<string, unknown>
  const string = (item: unknown): string => {
    if (typeof item !== 'string' || !item.trim() || item.length > 200) throw new TypeError('Invalid condition text')
    return item
  }
  const list = (item: unknown): string[] => {
    if (!Array.isArray(item) || item.length > 50) throw new TypeError('Invalid condition list')
    return item.map(string)
  }
  const number = (item: unknown): number | null => {
    if (item === null) return null
    if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) throw new TypeError('Invalid condition number')
    return item
  }
  const preference = (item: unknown): UserProfile['required'] => {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid preferences')
    const set = item as Record<string, unknown>
    return { roles: list(set.roles), regions: list(set.regions), skills: list(set.skills), employmentTypes: list(set.employmentTypes), annualSalaryMinKrw: number(set.annualSalaryMinKrw) }
  }
  const updatedAt = string(value.updatedAt)
  if (!Number.isFinite(Date.parse(updatedAt))) throw new TypeError('Invalid condition date')
  return { id: string(value.id), version: string(value.version), experienceYears: number(value.experienceYears), required: preference(value.required), preferred: preference(value.preferred), excludedKeywords: list(value.excludedKeywords), updatedAt }
}

export function applyCommit(state: CollectionState, batch: PageCommit): CollectionState {
  if (batch.version !== 1 || typeof batch.scope !== 'string' || !Array.isArray(batch.jobs) || !Array.isArray(batch.queue)) throw new TypeError('Invalid journal version')
  const integer = (value: number) => Number.isSafeInteger(value) && value >= 0
  if (batch.scope.length > 500 || (batch.completedUntil !== null && !integer(batch.completedUntil))) throw new TypeError('Invalid journal metadata')
  if (batch.checkpoint !== null && (!integer(batch.checkpoint.from) || !integer(batch.checkpoint.until) || !integer(batch.checkpoint.page) || batch.checkpoint.from > batch.checkpoint.until)) throw new TypeError('Invalid journal checkpoint')
  for (const job of batch.jobs) {
    const source = job.sources[0]
    if (!source || job.sources.length !== 1 || source.source !== 'saramin' || job.id !== `saramin:${source.sourceJobId}` || !/^[a-f0-9]{64}$/u.test(job.contentHash)) throw new TypeError('Invalid journal job')
    officialSaraminUrl(source.originalUrl, source.sourceJobId)
  }
  for (const item of batch.queue) {
    if (!/^saramin:[1-9]\d*$/u.test(item.jobId) || typeof item.fingerprint !== 'string' || item.fingerprint.length > 500 || !['hold-analysis', 'needs-review', 'excluded', 'sending', 'sent', 'delivery-unknown'].includes(item.status)) throw new TypeError('Invalid journal queue')
  }
  return {
    version: 1, scope: batch.scope, checkpoint: batch.checkpoint, completedUntil: batch.completedUntil,
    jobs: { ...state.jobs, ...Object.fromEntries(batch.jobs.map((job) => [job.id, job])) },
    queue: { ...state.queue, ...Object.fromEntries(batch.queue.map((item) => [item.jobId, item])) },
  }
}

export function runSaraminCollection(config: CollectionConfig, profile: UserProfile, previous: CollectionState, now: string, ports: CollectionPorts) {
  let requestsUsed = 0
  let recordsCollected = 0
  let changed = 0
  let state = previous
  const result = (status: string) => ({ status, requestsUsed, recordsCollected, changed, state, aiCalls: 0 as const, mailsSent: 0 as const })
  if (!config.enabled || !config.approved || !config.usageReviewed || !config.freeOnly || !config.key?.trim()) return result('HOLD_APPROVAL_CONFIGURATION')
  if (!config.key || config.key.length > 500 || !config.key.trim()) return result('HOLD_KEY_FORMAT')
  if (!config.keywords?.trim() || config.keywords.length > 100) return result('HOLD_SEARCH_SCOPE_REQUIRED')
  try { profile = parseCollectionProfile(profile) } catch { return result('HOLD_CONDITIONS_REQUIRED') }
  const scope = JSON.stringify([config.keywords.trim(), profile.version])
  if (state.scope !== null && state.scope !== scope) return result('HOLD_SCOPE_CHANGE_REVIEW')
  if (!Number.isInteger(config.pageSize) || config.pageSize < 1 || config.pageSize > 10 || !Number.isInteger(config.maxRequests) || config.maxRequests < 1 || config.maxRequests > 20) return result('HOLD_INVALID_BUDGET')
  const until = Math.floor(Date.parse(now) / 1000)
  if (!Number.isSafeInteger(until) || until < 0) return result('HOLD_INVALID_TIME')
  // Freeze a bounded modified-time window; overlap catches publication/index lag.
  // It collects new AND changed ongoing jobs. Never infer missing jobs are closed.
  let cursor = state.checkpoint ?? { from: Math.max(0, (state.completedUntil ?? until - 86400) - 86400), until, page: 0 }
  while (requestsUsed < config.maxRequests) {
    const url = 'https://oapi.saramin.co.kr/job-search?' + [
      ['access-key', config.key], ['count', String(config.pageSize)], ['start', String(cursor.page)],
      ['sort', 'ua'], ['updated_min', String(cursor.from)], ['updated_max', String(cursor.until)],
      ['keywords', config.keywords.trim()],
    ].map(([key, value]) => `${key}=${encodeURIComponent(value ?? '')}`).join('&')
    let payload: unknown
    let parsed = false
    for (let attempt = 0; attempt < 2 && requestsUsed < config.maxRequests; attempt++) {
      if (!ports.reserveRequest()) return result('HOLD_DAILY_REQUEST_BUDGET')
      requestsUsed++
      let response: { status: number; body: string }
      try { response = ports.request(url) } catch {
        if (attempt === 0 && requestsUsed < config.maxRequests) { ports.pause(1000); continue }
        return result('FAILED_NETWORK')
      }
      if (response.status === 429) return result('HOLD_REMOTE_QUOTA')
      if (response.status >= 500) {
        if (attempt === 0 && requestsUsed < config.maxRequests) { ports.pause(1000); continue }
        return result('FAILED_PROVIDER')
      }
      if (response.status !== 200) return result('HOLD_HTTP_RESPONSE')
      if (response.body.length > 500000) return result('HOLD_RESPONSE_SIZE')
      try { payload = JSON.parse(response.body) as unknown } catch { return result('HOLD_INVALID_JSON') }
      if (payload && typeof payload === 'object' && 'code' in payload) {
        const code = String(payload.code)
        return result(code === '4' ? 'HOLD_REMOTE_QUOTA' : code === '1' || code === '2' ? 'HOLD_AUTHENTICATION' : 'HOLD_API_ERROR')
      }
      parsed = true
      break
    }
    if (!parsed) return result('PARTIAL_REQUEST_BUDGET')
    let batch: PageCommit
    let finished: boolean
    try {
      const page = normalizeSaraminPage(payload, now)
      if (page.start !== cursor.page) return result('HOLD_PAGE_MISMATCH')
      const rawCount = (payload as { jobs: { count: number | string } }).jobs.count
      const count = Number(rawCount)
      if (count > config.pageSize || (count < config.pageSize && (cursor.page + 1) * config.pageSize < page.total)) return result('HOLD_PAGE_COVERAGE')
      const jobs = deduplicateJobs(page.jobs).jobs.map((job) => ({ ...job, sources: job.sources.map((source) => ({ ...source, usageReview: 'approved' as const })) }))
      const queue = jobs.flatMap((job): QueueItem[] => {
        const fingerprint = JSON.stringify([job.contentHash, profile.version])
        if (state.queue[job.id]?.fingerprint === fingerprint) return []
        const decision = evaluateConditions(job, profile).decision
        return [{ jobId: job.id, fingerprint, status: decision === 'exclude' ? 'excluded' : decision === 'needs-review' ? 'needs-review' : 'hold-analysis' }]
      })
      finished = (cursor.page + 1) * config.pageSize >= page.total
      batch = { version: 1, scope, jobs, queue, checkpoint: finished ? null : { ...cursor, page: cursor.page + 1 }, completedUntil: finished ? cursor.until : state.completedUntil }
      // One journal cell per page; refuse oversized writes rather than truncate.
      if (JSON.stringify(batch).length > 45000) return result('HOLD_STORAGE_RECORD_SIZE')
    } catch { return result('HOLD_SCHEMA_OR_CONDITIONS') }
    try { ports.commit(batch) } catch { return result('FAILED_STORAGE_REPLAY_REQUIRED') }
    state = applyCommit(state, batch)
    recordsCollected += batch.jobs.length
    changed += batch.queue.length
    if (finished) return result('COMPLETE_WINDOW')
    cursor = batch.checkpoint!
  }
  return result('PARTIAL_REQUEST_BUDGET')
}

// Notification transport is intentionally absent. A crash during "sending" must
// become delivery-unknown; automatic resend could duplicate an already sent mail.
export function recoverQueueItem(item: QueueItem): QueueItem {
  return item.status === 'sending' ? { ...item, status: 'delivery-unknown' } : item
}
