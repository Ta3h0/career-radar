import { describe, expect, it } from 'vitest'
import { parseJobIdentity } from './jobs.ts'

describe('official source identity boundary', () => {
  it.each(['work24', 'saramin'])('accepts %s and normalizes surrounding ID whitespace', (source) => {
    expect(parseJobIdentity({ source, sourceJobId: ' example-job ' })).toEqual({ source, sourceJobId: 'example-job' })
  })
  it.each([null, [], 'job', {}, { source: 'scraped', sourceJobId: 'example' }, { source: 'work24', sourceJobId: 1 }, { source: 'saramin', sourceJobId: ' ' }])('rejects malformed or unsupported input: %j', (input) => {
    expect(() => parseJobIdentity(input)).toThrow(TypeError)
  })
  it('drops unrecognized fields at the boundary', () => {
    expect(parseJobIdentity({ source: 'work24', sourceJobId: 'example', extra: 'untrusted' })).toEqual({ source: 'work24', sourceJobId: 'example' })
  })
})
