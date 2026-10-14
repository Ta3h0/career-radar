import { describe, expect, it } from 'vitest'
import type { UserProfile } from '../src/domain/profile.ts'
import { normalizeSaraminPage } from '../server/collectors/saramin-normalize.ts'
import { deduplicateJobs } from '../server/pipeline/deduplicate.ts'
import { evaluateConditions } from '../server/pipeline/filter.ts'
import { prepareSaraminBatch } from '../server/pipeline/prepare.ts'

// Synthetic contracts only: no copied jobs, salary preferences or personal data.
const time = '2026-10-14T00:00:00Z'
const rawJob = (changes: Record<string, unknown> = {}) => ({
  id: '101', active: 1,
  url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101',
  company: { detail: { name: '합성 기업' } },
  position: { title: '합성 개발자', location: { name: '서울 > 테스트구' }, 'job-code': { name: '개발자' }, 'job-type': { name: '정규직' } },
  salary: { code: '16', name: '4,000만원 이상' },
  'posting-timestamp': '1791936000', 'modification-timestamp': '1791936000',
  'expiration-timestamp': '1794528000', 'close-type': { code: '1' },
  ...changes,
})
const page = (jobs: unknown[]) => ({ jobs: { count: jobs.length, total: String(jobs.length), start: 0, job: jobs } })
const job = (changes: Record<string, unknown> = {}) => {
  const result = normalizeSaraminPage(page([rawJob(changes)]), time).jobs[0]
  if (!result) throw new Error('Missing synthetic job')
  return result
}
const profile = (required: Partial<UserProfile['required']> = {}): UserProfile => {
  const empty = { roles: [], regions: [], employmentTypes: [], skills: [], annualSalaryMinKrw: null }
  return { id: 'synthetic-profile', version: 'v1', experienceYears: null, required: { ...empty, ...required }, preferred: empty, excludedKeywords: [], updatedAt: time }
}

describe('documented Saramin JSON boundary (synthetic)', () => {
  it('keeps only mapped fields and distinguishes missing full body and skills', () => {
    const result = normalizeSaraminPage(page([rawJob({ description: 'Untrusted instructions are data', contact: 'not-for-retention' })]), time)
    expect(result.bodyAvailability).toBe('not-provided-by-documented-api')
    expect(result.jobs[0]?.roles).toEqual(['개발자'])
    expect(result.jobs[0]?.salary).toEqual({ min: 40000000, max: null, currency: 'KRW', period: 'year' })
    expect(result.jobs[0]?.missingFields).toContain('skills')
    expect(JSON.stringify(result)).not.toContain('not-for-retention')
    expect(JSON.stringify(result)).not.toContain('Untrusted instructions')
    expect(result.jobs[0]?.sources[0]?.usageReview).toBe('pending')
  })
  it.each(['0', '99', '101', '104', '999'])('keeps nonannual or unknown salary code %s unknown', (code) => {
    expect(job({ salary: { code } }).salary).toBeNull()
  })
  it('normalizes equivalent collection time zones without changing content hash', () => {
    const first = normalizeSaraminPage(page([rawJob()]), time).jobs[0]
    const repeat = normalizeSaraminPage(page([rawJob()]), '2026-10-14T09:00:00+09:00').jobs[0]
    expect(first?.collectedAt).toBe(repeat?.collectedAt)
    expect(first?.contentHash).toBe(repeat?.contentHash)
  })
  it.each([null, {}, { jobs: [] }, { jobs: { count: 1, start: 0, total: 1, job: [] } }, page([rawJob({ id: 'invalid' })]), page([rawJob({ active: 2 })])])('rejects malformed page before a cursor can advance: %j', (input) => {
    expect(() => normalizeSaraminPage(input, time)).toThrow(TypeError)
  })
  it.each(['javascript:alert(1)', 'https://saramin.co.kr.attacker.invalid/zf_user/jobs/relay/view?rec_idx=101', 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=102'])('rejects unsafe or mismatched source URL %s', (url) => {
    expect(() => job({ url })).toThrow()
  })
  it('rejects URL credentials without retaining any credential value', () => {
    const url = new URL('https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101')
    url.username = 'synthetic-user'
    url.password = 'demo'
    expect(() => job({ url: url.href })).toThrow(TypeError)
  })
  it('discards arbitrary URL query values and upgrades the documented legacy HTTP link', () => {
    expect(job({ url: 'http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101&untrusted=value' }).sources[0]?.originalUrl).toBe('https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101')
  })
  it('does not turn ongoing recruitment into a specific closing date', () => {
    expect(job({ 'close-type': { code: '2' } }).closesAt).toBeNull()
  })
  it('skips explicitly inactive jobs without declaring every missing job closed', () => {
    expect(normalizeSaraminPage(page([rawJob({ active: 0 })]), time).jobs).toEqual([])
  })
  it('accepts a documented empty page', () => {
    expect(normalizeSaraminPage(page([]), time).jobs).toEqual([])
  })
})

describe('source identity deduplication', () => {
  it('retains the latest source revision independent of input order', () => {
    const old = job()
    const recent = { ...old, updatedAt: '2026-10-15T00:00:00.000Z', title: '수정된 합성 제목', contentHash: 'synthetic-changed' }
    expect(deduplicateJobs([recent, old, recent]).jobs).toEqual([recent])
    expect(deduplicateJobs([old, recent]).jobs).toEqual([recent])
  })
  it('preserves both sources while flagging a cross-source review candidate', () => {
    const first = job()
    const second = { ...first, id: 'work24:synthetic-101', sources: [{ ...first.sources[0]!, source: 'work24' as const, sourceJobId: 'synthetic-101', originalUrl: 'https://www.work24.go.kr/' }] }
    const result = deduplicateJobs([first, second])
    expect(result.jobs).toHaveLength(2)
    expect(result.candidateGroups[0]).toHaveLength(2)
  })
  it('does not group different regions or missing company names', () => {
    const first = job()
    expect(deduplicateJobs([first, { ...first, id: 'other', company: null, regions: ['다른 지역'] }]).candidateGroups).toEqual([])
  })
})

describe('required filters keep unknown facts separate', () => {
  it('matches role and hierarchical region with a supported salary minimum', () => {
    expect(evaluateConditions(job(), profile({ roles: ['개발자'], regions: ['서울'], annualSalaryMinKrw: 40000000 })).decision).toBe('include')
  })
  it('does not equate Java and JavaScript through substring guessing', () => {
    expect(evaluateConditions({ ...job(), roles: ['JavaScript'] }, profile({ roles: ['Java'] })).decision).toBe('exclude')
  })
  it('keeps missing salary or skills for review instead of inventing facts', () => {
    const result = evaluateConditions(job({ salary: { code: '99' } }), profile({ annualSalaryMinKrw: 40000000, skills: ['합성기술'] }))
    expect(result.decision).toBe('needs-review')
    expect(result.unknownFields).toEqual(['skills', 'salary'])
  })
  it('treats an open lower salary bound below the threshold as uncertain', () => {
    expect(evaluateConditions(job(), profile({ annualSalaryMinKrw: 50000000 })).decision).toBe('needs-review')
  })
  it('rejects a known upper bound below the required minimum', () => {
    expect(evaluateConditions(job({ salary: { code: '20' } }), profile({ annualSalaryMinKrw: 100000000 })).decision).toBe('exclude')
  })
  it('does not annualize a monthly salary by guessing bonuses or hours', () => {
    expect(evaluateConditions({ ...job(), salary: { min: 3000000, max: 3000000, period: 'month', currency: 'KRW' } }, profile({ annualSalaryMinKrw: 30000000 })).decision).toBe('needs-review')
  })
  it('does not turn preferred regions into exclusions', () => {
    const conditions = profile()
    expect(evaluateConditions(job(), { ...conditions, preferred: { ...conditions.preferred, regions: ['다른 지역'] } }).decision).toBe('include')
  })
  it('distinguishes an excluded keyword match from unavailable full-body evidence', () => {
    expect(evaluateConditions(job(), { ...profile(), excludedKeywords: ['합성'] }).decision).toBe('exclude')
    expect(evaluateConditions(job(), { ...profile(), excludedKeywords: ['미확인단어'] }).decision).toBe('needs-review')
  })
  it('rejects invalid or empty conditions', () => {
    expect(() => evaluateConditions(job(), profile({ roles: [' '] }))).toThrow(TypeError)
    expect(() => evaluateConditions(job(), profile({ annualSalaryMinKrw: -1 }))).toThrow(TypeError)
  })
})

describe('offline automation preparation', () => {
  it('reprocessing the same source creates no duplicate changed items and never calls AI or mail', () => {
    const input = page([rawJob(), rawJob()])
    const state = new Map<string, string>()
    const first = prepareSaraminBatch(input, profile(), time, state)
    const repeat = prepareSaraminBatch(input, profile(), '2026-10-15T00:00:00Z', first.nextHashes)
    expect(first.jobs).toHaveLength(1)
    expect(first.analysisCandidates).toHaveLength(1)
    expect(repeat.changedJobIds).toEqual([])
    expect(first.analysisStatus).toMatch(/^on-hold/)
    expect(first.coverage.complete).toBe(false)
    expect(state.size).toBe(0)
  })
  it('reevaluates when source contents or condition version changes', () => {
    const first = prepareSaraminBatch(page([rawJob()]), profile(), time)
    expect(prepareSaraminBatch(page([rawJob({ salary: { code: '17' } })]), profile(), time, first.nextHashes).changedJobIds).toHaveLength(1)
    expect(prepareSaraminBatch(page([rawJob()]), { ...profile(), version: 'v2' }, time, first.nextHashes).changedJobIds).toHaveLength(1)
  })
  it('cannot advance prior state on a rejected API page', () => {
    const state = new Map([['preserved', 'old']])
    expect(() => prepareSaraminBatch({}, profile(), time, state)).toThrow()
    expect([...state]).toEqual([['preserved', 'old']])
  })
})
