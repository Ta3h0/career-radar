import { describe, expect, it, vi } from 'vitest'
import { applyCommit, emptyCollectionState, recoverQueueItem, runSaraminCollection, type CollectionConfig, type CollectionPorts, type PageCommit } from '../server/collectors/saramin-runner.ts'
import { documentationExample } from './fixtures/saramin-documentation.ts'
import type { UserProfile } from '../src/domain/profile.ts'

const time = '2026-10-14T00:00:00Z'
const preference = { roles: [], regions: [], employmentTypes: [], skills: [], annualSalaryMinKrw: null }
const profile: UserProfile = { id: 'synthetic', version: 'v1', experienceYears: null, required: preference, preferred: preference, excludedKeywords: [], updatedAt: time }
const config: CollectionConfig = { enabled: true, approved: true, usageReviewed: true, freeOnly: true, key: 'demo', keywords: '문서 예시', pageSize: 1, maxRequests: 3 }
const response = (start = 0) => ({ status: 200, body: JSON.stringify({ jobs: { start, count: 1, total: '2', job: [documentationExample.jobs.job[start]] } }) })
function harness() {
  const commits: PageCommit[] = []
  const ports: CollectionPorts = {
    request: vi.fn((url: string) => response(Number(new URL(url).searchParams.get('start')))),
    reserveRequest: vi.fn(() => true), commit: vi.fn((batch) => { commits.push(batch) }), pause: vi.fn(),
  }
  return { ports, commits }
}

describe('approval-gated collector with mock transport and journal', () => {
  it.each(['enabled', 'approved', 'usageReviewed', 'freeOnly'] as const)('never requests without %s', (field) => {
    const { ports } = harness()
    expect(runSaraminCollection({ ...config, [field]: false }, profile, emptyCollectionState(), time, ports).status).toBe('HOLD_APPROVAL_CONFIGURATION')
    expect(ports.request).not.toHaveBeenCalled()
    expect(ports.commit).not.toHaveBeenCalled()
  })
  it('never requests without a key or an explicit search scope', () => {
    const { ports } = harness()
    expect(runSaraminCollection({ ...config, key: undefined }, profile, emptyCollectionState(), time, ports).requestsUsed).toBe(0)
    expect(runSaraminCollection({ ...config, keywords: undefined }, profile, emptyCollectionState(), time, ports).requestsUsed).toBe(0)
    expect(ports.request).not.toHaveBeenCalled()
  })
  it('saves every page before advancing, uses page numbers and frozen modified-time bounds', () => {
    const { ports, commits } = harness()
    const result = runSaraminCollection(config, profile, emptyCollectionState(), time, ports)
    expect(result.status).toBe('COMPLETE_WINDOW')
    expect(result.recordsCollected).toBe(2)
    expect(result.changed).toBe(2)
    expect(commits[0]?.checkpoint?.page).toBe(1)
    expect(commits[1]?.checkpoint).toBeNull()
    expect(result.aiCalls).toBe(0)
    expect(result.mailsSent).toBe(0)
    expect(Object.values(result.state.queue).map((item) => item.status)).toEqual(['hold-analysis', 'hold-analysis'])
    expect(vi.mocked(ports.request).mock.calls.map(([url]) => new URL(url).searchParams.get('start'))).toEqual(['0', '1'])
    expect(new URL(vi.mocked(ports.request).mock.calls[0]![0]).searchParams.get('sort')).toBe('ua')
    expect(commits.reduce(applyCommit, emptyCollectionState())).toEqual(result.state)
  })
  it('resumes an incomplete window and does not recreate the queue on repeated input', () => {
    const { ports } = harness()
    const first = runSaraminCollection({ ...config, maxRequests: 1 }, profile, emptyCollectionState(), time, ports)
    expect(first.status).toBe('PARTIAL_REQUEST_BUDGET')
    const second = runSaraminCollection(config, profile, first.state, '2026-10-15T00:00:00Z', ports)
    expect(second.requestsUsed).toBe(1)
    expect(second.state.completedUntil).toBe(Math.floor(Date.parse(time) / 1000))
    const repeat = runSaraminCollection(config, profile, second.state, '2026-10-15T00:00:00Z', ports)
    expect(repeat.changed).toBe(0)
    expect(Object.keys(repeat.state.queue)).toHaveLength(2)
  })
  it.each([['1', 'HOLD_AUTHENTICATION'], ['2', 'HOLD_AUTHENTICATION'], ['3', 'HOLD_API_ERROR'], ['4', 'HOLD_REMOTE_QUOTA'], ['99', 'HOLD_API_ERROR']])('recognizes HTTP 200 API error %s without leaking its body', (code, expected) => {
    const { ports } = harness()
    ports.request = vi.fn(() => ({ status: 200, body: JSON.stringify({ code, message: 'synthetic-untrusted-message' }) }))
    const result = runSaraminCollection(config, profile, emptyCollectionState(), time, ports)
    expect(result.status).toBe(expected)
    expect(result.requestsUsed).toBe(1)
    expect(JSON.stringify(result)).not.toContain('synthetic-untrusted-message')
    expect(ports.commit).not.toHaveBeenCalled()
  })
  it('bounds retries and counts every failed attempt against the persisted daily budget', () => {
    const { ports } = harness()
    ports.request = vi.fn(() => { throw new Error('private transport detail') })
    const result = runSaraminCollection(config, profile, emptyCollectionState(), time, ports)
    expect(result.status).toBe('FAILED_NETWORK')
    expect(result.requestsUsed).toBe(2)
    expect(ports.reserveRequest).toHaveBeenCalledTimes(2)
    expect(ports.pause).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(result)).not.toContain('private transport detail')
  })
  it('stops on daily quota and HTTP throttling without automatic retries', () => {
    const { ports } = harness()
    ports.reserveRequest = vi.fn(() => false)
    expect(runSaraminCollection(config, profile, emptyCollectionState(), time, ports).status).toBe('HOLD_DAILY_REQUEST_BUDGET')
    expect(ports.request).not.toHaveBeenCalled()
    ports.reserveRequest = vi.fn(() => true)
    ports.request = vi.fn(() => ({ status: 429, body: '' }))
    expect(runSaraminCollection(config, profile, emptyCollectionState(), time, ports).requestsUsed).toBe(1)
  })
  it('does not advance its checkpoint after a storage error', () => {
    const { ports } = harness()
    ports.commit = vi.fn(() => { throw new Error('write failed') })
    const previous = emptyCollectionState()
    const result = runSaraminCollection(config, profile, previous, time, ports)
    expect(result.status).toBe('FAILED_STORAGE_REPLAY_REQUIRED')
    expect(result.state).toBe(previous)
    expect(result.recordsCollected).toBe(0)
  })
  it('fails closed on malformed payloads, page mismatches and query/condition version changes', () => {
    const { ports } = harness()
    ports.request = vi.fn(() => response(1))
    expect(runSaraminCollection(config, profile, emptyCollectionState(), time, ports).status).toBe('HOLD_PAGE_MISMATCH')
    ports.request = vi.fn(() => ({ status: 200, body: '{}' }))
    expect(runSaraminCollection(config, profile, emptyCollectionState(), time, ports).status).toBe('HOLD_SCHEMA_OR_CONDITIONS')
    const state = { ...emptyCollectionState(), scope: 'previous-scope' }
    expect(runSaraminCollection(config, profile, state, time, ports).requestsUsed).toBe(0)
  })
  it('holds uncertain mail deliveries for manual reconciliation instead of resending', () => {
    const pending = { jobId: 'saramin:101', fingerprint: 'synthetic', status: 'hold-analysis' as const }
    expect(recoverQueueItem(pending)).toBe(pending)
    expect(recoverQueueItem({ ...pending, status: 'sending' }).status).toBe('delivery-unknown')
  })
  it('rejects corrupted persisted checkpoints before they can become query parameters', () => {
    expect(() => applyCommit(emptyCollectionState(), { version: 1, scope: 'synthetic', jobs: [], queue: [], completedUntil: null, checkpoint: { from: 10, until: 5, page: -1 } })).toThrow(TypeError)
  })
})
