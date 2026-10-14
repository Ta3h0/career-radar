import { describe, expect, it } from 'vitest'
import { documentationExample } from './fixtures/saramin-documentation.ts'
import { normalizeSaraminPage } from '../server/collectors/saramin-normalize.ts'
import { evaluateConditions } from '../server/pipeline/filter.ts'
import { prepareSaraminBatch } from '../server/pipeline/prepare.ts'
import type { UserProfile } from '../src/domain/profile.ts'

const time = '2026-10-14T00:00:00Z'
const empty = { roles: [], regions: [], employmentTypes: [], skills: [], annualSalaryMinKrw: null }
export const syntheticConditions: UserProfile = { id: 'synthetic', version: 'v1', experienceYears: null, required: empty, preferred: empty, excludedKeywords: [], updatedAt: time }

describe('official documentation factual fields, reconstructed offline (not collection)', () => {
  it('maps the documented JSON envelope, timestamps, salary and experience', () => {
    const page = normalizeSaraminPage(documentationExample, time)
    expect(page.start).toBe(1)
    expect(page.total).toBe(7629)
    expect(page.jobs.map((job) => job.salary?.min)).toEqual([18000000, 14000000])
    expect(page.jobs.map((job) => job.experienceYears)).toEqual([{ min: 2, max: 3 }, { min: 0, max: 0 }])
    expect(page.jobs[0]?.publishedAt).toBe('2019-05-30T04:46:04.000Z')
    expect(page.jobs[0]?.sources[0]?.originalUrl).toContain('utm_source=job-search-api')
    expect(page.jobs[0]?.missingFields).toContain('skills')
  })
  it('leaves conflicting historical salary code 18 unknown instead of falsely excluding', () => {
    const item = { ...documentationExample.jobs.job[0], salary: { code: '18', name: '5,000~6,000만원' } }
    const job = normalizeSaraminPage({ jobs: { count: 1, total: 1, start: 0, job: [item] } }, time).jobs[0]!
    expect(job.salary).toBeNull()
    expect(evaluateConditions(job, { ...syntheticConditions, required: { ...empty, annualSalaryMinKrw: 60000000 } }).decision).toBe('needs-review')
  })
  it('normalizes, deduplicates, filters and replays without AI or mail', () => {
    const first = prepareSaraminBatch(documentationExample, { ...syntheticConditions, required: { ...empty, annualSalaryMinKrw: 17000000 } }, time)
    expect(first.jobs).toHaveLength(2)
    expect(first.decisions.map((value) => value.decision).sort()).toEqual(['exclude', 'include'])
    expect(prepareSaraminBatch(documentationExample, syntheticConditions, time, first.nextHashes).changedJobIds).toEqual([])
    expect(first.analysisStatus).toMatch(/^on-hold/u)
  })
  it('enforces experience upper bounds without treating missing facts as matches', () => {
    const job = normalizeSaraminPage(documentationExample, time).jobs[0]!
    expect(evaluateConditions(job, { ...syntheticConditions, experienceYears: 4 }).decision).toBe('exclude')
    expect(evaluateConditions(job, { ...syntheticConditions, experienceYears: 2 }).decision).toBe('include')
  })
  it('does not reinterpret nonannual/unknown codes as annual amounts', () => {
    const item = { ...documentationExample.jobs.job[0], salary: { code: '101', name: '300~400만원' } }
    expect(normalizeSaraminPage({ jobs: { count: 1, total: 1, start: 0, job: [item] } }, time).jobs[0]?.salary).toBeNull()
  })
  it.each([['21', '9,000~1억원', 90000000, 100000000], ['22', '1억원 이상', 100000000, null]])('handles the explicit official mixed-unit salary label %s', (code, name, min, max) => {
    const item = { ...documentationExample.jobs.job[0], salary: { code, name } }
    expect(normalizeSaraminPage({ jobs: { count: 1, total: 1, start: 0, job: [item] } }, time).jobs[0]?.salary).toEqual({ min, max, currency: 'KRW', period: 'year' })
  })
})
