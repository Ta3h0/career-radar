import { createHash } from 'node:crypto'
import type { JobFactField, JobPosting } from '../../src/domain/jobs.ts'

export const SARAMIN_SCHEMA_VERSION = 'saramin-metadata-v2'
type RecordValue = Record<string, unknown>
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Expected API object')
  return value as RecordValue
}
function optionalRecord(value: unknown): RecordValue {
  return value === undefined || value === null ? {} : record(value)
}
function text(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 4000) throw new TypeError('Invalid API text')
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ') || null
}
function integer(value: unknown): number {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/u.test(value))) throw new TypeError('Expected non-negative API integer')
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('Invalid API integer')
  return number
}
function date(value: unknown): string | null {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return null
  const result = new Date(integer(value) * 1000)
  if (!Number.isFinite(result.getTime())) throw new TypeError('Invalid API timestamp')
  return result.toISOString()
}
function names(value: unknown): readonly string[] | null {
  const name = text(optionalRecord(value).name)
  return name ? [...new Set(name.split(',').map((part) => part.trim()).filter(Boolean))] : null
}

// Gas V8 has no WHATWG URL global. This narrow parser also rejects credentials,
// nonstandard ports, duplicate IDs and redirect links without following them.
export function officialSaraminUrl(value: string, expectedId?: string): string {
  const match = /^https?:\/\/(?:www\.)?saramin\.co\.kr\/zf_user\/jobs\/relay\/view\?([^#\s]+)$/u.exec(value)
  if (!match?.[1]) throw new TypeError('Untrusted official job URL')
  const pairs = match[1].split('&').map((part) => {
    const [key, ...rest] = part.split('=')
    return [decodeURIComponent(key ?? ''), decodeURIComponent(rest.join('='))] as const
  })
  const ids = pairs.filter(([key]) => key === 'rec_idx')
  const id = ids[0]?.[1]
  if (ids.length !== 1 || !id || !/^[1-9]\d*$/u.test(id) || (expectedId && id !== expectedId)) throw new TypeError('Mismatched official job ID')
  let result = `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`
  // Retain only the documented API attribution, never arbitrary tracking values.
  for (const [key, expected] of [['utm_source', 'job-search-api'], ['utm_medium', 'api'], ['utm_campaign', 'saramin-job-search-api']]) {
    if (pairs.some(([name, val]) => name === key && val === expected)) result += `&${key}=${expected}`
  }
  return result
}

function experience(value: unknown): JobPosting['experienceYears'] {
  const item = optionalRecord(value)
  if (item.code === undefined) return null
  const code = integer(item.code)
  if (code === 0 || code === 3) return { min: 0, max: null }
  if (code === 1) return { min: 0, max: 0 }
  if (code !== 2) return null
  const min = item.min === undefined ? null : integer(item.min)
  const max = item.max === undefined || integer(item.max) === 0 ? null : integer(item.max)
  if (min !== null && max !== null && min > max) throw new TypeError('Invalid experience range')
  return { min, max }
}
// Official code table lower bounds; an "or more" value has no inferred ceiling.
const salaryBounds: Readonly<Record<string, readonly [number, number | null]>> = {
  '9': [26000000, null], '10': [28000000, null], '11': [30000000, null],
  '12': [32000000, null], '13': [34000000, null], '14': [36000000, null],
  '15': [38000000, null], '16': [40000000, null], '17': [50000000, null],
  '18': [60000000, null], '19': [70000000, null], '20': [80000000, 90000000],
  '21': [90000000, 100000000], '22': [100000000, null],
}

function salaryValue(value: unknown): JobPosting['salary'] {
  const item = optionalRecord(value)
  if (!/^(?:[2-9]|1\d|2[0-2])$/u.test(String(item.code))) return null
  const bounds = salaryBounds[String(item.code)]
  const label = text(item.name)
  // Preserve the current code table when no readable amount is provided.
  // The official historical examples disagree with today's table: never guess.
  if (!label) return bounds ? { min: bounds[0], max: bounds[1], currency: 'KRW', period: 'year' } : null
  if (String(item.code) === '21' && label === '9,000~1억원') return { min: 90000000, max: 100000000, currency: 'KRW', period: 'year' }
  if (String(item.code) === '22' && label === '1억원 이상') return { min: 100000000, max: null, currency: 'KRW', period: 'year' }
  const range = /^(\d[\d,]*)\s*~\s*(\d[\d,]*)만원$/u.exec(label)
  const lower = /^(\d[\d,]*)만원\s*이상$/u.exec(label)
  if (!range && !lower) return null
  const min = Number((range?.[1] ?? lower?.[1])?.replaceAll(',', '')) * 10000
  const max = range ? Number(range[2]?.replaceAll(',', '')) * 10000 : null
  if (!Number.isSafeInteger(min) || min < 0 || (max !== null && (!Number.isSafeInteger(max) || max < min))) return null
  if (bounds && (bounds[0] !== min || (bounds[1] !== null && bounds[1] !== max))) return null
  return { min, max, currency: 'KRW', period: 'year' }
}

function normalizeJob(input: unknown, collectedAt: string): JobPosting {
  const raw = record(input)
  const sourceJobId = String(integer(raw.id))
  if (sourceJobId === '0') throw new TypeError('Missing source job ID')
  const urlText = text(raw.url)
  if (!urlText) throw new TypeError('Missing official job URL')
  const originalUrl = officialSaraminUrl(urlText, sourceJobId)
  const position = optionalRecord(raw.position)
  const salary = salaryValue(raw.salary)
  const facts = {
    title: text(position.title),
    company: text(optionalRecord(optionalRecord(raw.company).detail).name),
    roles: names(position['job-code']),
    regions: names(position.location),
    experienceYears: experience(position['experience-level']),
    employmentTypes: names(position['job-type']),
    // API keywords are not proof of a required skill. No body is scraped.
    skills: null,
    salary,
    publishedAt: date(raw['posting-timestamp']),
    updatedAt: date(raw['modification-timestamp']),
    closesAt: String(optionalRecord(raw['close-type']).code) === '1' ? date(raw['expiration-timestamp']) : null,
  }
  const fields: readonly JobFactField[] = ['title', 'company', 'roles', 'regions', 'experienceYears', 'employmentTypes', 'skills', 'salary', 'closesAt']
  const missingFields = fields.filter((field) => facts[field] === null)
  return {
    id: `saramin:${sourceJobId}`,
    sources: [{ source: 'saramin', sourceJobId, originalUrl, attribution: '사람인 채용정보 API', availableFields: fields.filter((field) => facts[field] !== null), usageReview: 'pending' }],
    ...facts,
    collectedAt,
    contentHash: createHash('sha256').update(JSON.stringify({ schema: SARAMIN_SCHEMA_VERSION, facts })).digest('hex'),
    missingFields,
  }
}

export interface NormalizedSaraminPage {
  readonly jobs: readonly JobPosting[]
  readonly total: number
  readonly start: number
  readonly bodyAvailability: 'not-provided-by-documented-api'
  readonly schemaVersion: typeof SARAMIN_SCHEMA_VERSION
}

// Maps an already obtained JSON response; this function never performs I/O.
// A malformed item rejects the page, so callers cannot silently advance a cursor.
export function normalizeSaraminPage(input: unknown, collectedAt: string): NormalizedSaraminPage {
  if (!Number.isFinite(Date.parse(collectedAt)) || !/[Zz]$|[+-]\d\d:\d\d$/u.test(collectedAt)) throw new TypeError('Collection time must include a time zone')
  const page = record(record(input).jobs)
  const count = integer(page.count)
  const total = integer(page.total)
  const start = integer(page.start)
  if (count > 110 || total < count || !Array.isArray(page.job) || page.job.length !== count) throw new TypeError('Invalid API page envelope')
  const normalizedCollectionTime = new Date(collectedAt).toISOString()
  const jobs = page.job.flatMap((item: unknown) => {
    const active = integer(record(item).active)
    if (active !== 0 && active !== 1) throw new TypeError('Invalid active state')
    return active === 1 ? [normalizeJob(item, normalizedCollectionTime)] : []
  })
  return { jobs, total, start, bodyAvailability: 'not-provided-by-documented-api', schemaVersion: SARAMIN_SCHEMA_VERSION }
}
