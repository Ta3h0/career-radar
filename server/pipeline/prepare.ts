import type { UserProfile } from '../../src/domain/profile.ts'
import { normalizeSaraminPage } from '../collectors/saramin-normalize.ts'
import { deduplicateJobs } from './deduplicate.ts'
import { evaluateConditions } from './filter.ts'

// previousHashes must come from protected, per-profile persistence in a live runner.
// Nothing mutates until the caller persists this result after successful work.
export function prepareSaraminBatch(input: unknown, profile: UserProfile, collectedAt: string, previousHashes: ReadonlyMap<string, string> = new Map()) {
  const page = normalizeSaraminPage(input, collectedAt)
  const deduplicated = deduplicateJobs(page.jobs)
  const fingerprint = (job: { contentHash: string }) => JSON.stringify([job.contentHash, profile.version])
  const changed = deduplicated.jobs.filter((job) => previousHashes.get(job.id) !== fingerprint(job))
  const decisions = changed.map((job) => evaluateConditions(job, profile))
  return {
    mode: 'offline-data-processing' as const,
    jobs: deduplicated.jobs,
    candidateGroups: deduplicated.candidateGroups,
    changedJobIds: changed.map((job) => job.id),
    decisions,
    analysisCandidates: decisions.filter((decision) => decision.decision === 'include').map((decision) => decision.jobId),
    analysisStatus: 'on-hold-approval-privacy-and-full-body-review-required' as const,
    nextHashes: new Map([...previousHashes, ...deduplicated.jobs.map((job) => [job.id, fingerprint(job)] as const)]),
    coverage: { totalReportedByApi: page.total, recordsInThisPage: deduplicated.jobs.length, complete: false as const },
  }
}
