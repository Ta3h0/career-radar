import type { JobPosting } from '../../src/domain/jobs.ts'
import type { DeduplicationResult } from './contracts.ts'

const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')

// Exact source IDs collapse; cross-source similarities are review groups only.
export function deduplicateJobs(input: readonly JobPosting[]): DeduplicationResult {
  const unique = new Map<string, JobPosting>()
  for (const job of input) {
    if (job.sources.length !== 1) throw new TypeError('Expected one unmerged source per input job')
    const source = job.sources[0]
    if (!source) throw new TypeError('Missing job source')
    const key = JSON.stringify([source.source, source.sourceJobId])
    const current = unique.get(key)
    const rank = (item: JobPosting) => JSON.stringify([item.updatedAt ?? item.publishedAt ?? '', item.collectedAt, item.contentHash])
    if (!current || rank(job) > rank(current)) unique.set(key, job)
  }
  const jobs = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id))
  const groups = new Map<string, JobPosting[]>()
  for (const job of jobs) {
    if (!job.company || !job.title || !job.regions?.length) continue
    const key = JSON.stringify([normalized(job.company), normalized(job.title), job.regions.map(normalized).sort(), job.closesAt])
    groups.set(key, [...(groups.get(key) ?? []), job])
  }
  const candidateGroups = [...groups.values()]
    .filter((group) => new Set(group.map((job) => job.sources[0]?.source)).size > 1)
    .map((group) => group.map((job) => job.id))
  return { jobs, candidateGroups }
}
