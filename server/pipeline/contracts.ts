import type { AnalysisResult } from '../../src/domain/analysis.ts'
import type { JobPosting } from '../../src/domain/jobs.ts'
import type { UserProfile } from '../../src/domain/profile.ts'

// These are extension points only; no automation is scheduled or executed.
export interface DeduplicationResult {
  readonly jobs: readonly JobPosting[]
  readonly candidateGroups: readonly (readonly string[])[]
}
export interface Deduplicator {
  deduplicate(jobs: readonly JobPosting[]): DeduplicationResult
}
export interface FilterDecision {
  readonly jobId: string
  readonly decision: 'include' | 'exclude' | 'needs-review'
  readonly reasons: readonly string[]
  readonly unknownFields: readonly string[]
}
export interface ConditionFilter {
  evaluate(job: JobPosting, profile: UserProfile): FilterDecision
}
export interface AnalysisValidator {
  validate(input: unknown, job: JobPosting, profile: UserProfile): AnalysisResult
}
// Later orchestration order: collect -> validate -> normalize -> deduplicate
// -> filter -> free analysis -> validate evidence -> persist -> consented outbox.
