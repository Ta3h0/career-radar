import type { JobPosting, JobSource } from '../../src/domain/jobs.ts'

// Server-only ports. No credentials, endpoints, implementation or side effects.
export interface CollectionRequest {
  readonly runId: string
  readonly checkpoint: string | null
  readonly maxRequests: number
  readonly maxRetries: number
  readonly signal: AbortSignal
}

export type CollectionResult =
  | { readonly status: 'success' | 'partial'; readonly jobs: readonly JobPosting[]; readonly nextCheckpoint: string | null; readonly requestsUsed: number; readonly warnings: readonly string[] }
  | { readonly status: 'on-hold' | 'failed'; readonly reason: string; readonly retryAfter: string | null }

export interface OfficialJobCollector {
  readonly source: JobSource
  collect(request: CollectionRequest): Promise<CollectionResult>
}
