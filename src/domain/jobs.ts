export type JobSource = 'work24' | 'saramin'
export interface JobIdentity { readonly source: JobSource; readonly sourceJobId: string }
export type JobFactField = 'title' | 'company' | 'regions' | 'experienceYears' | 'employmentTypes' | 'skills' | 'salary' | 'closesAt'

export interface JobSourceReference extends JobIdentity {
  readonly originalUrl: string
  readonly attribution: string
  readonly availableFields: readonly JobFactField[]
  readonly usageReview: 'pending' | 'approved'
}

// Null means the official API has not established the fact.
export interface JobPosting {
  readonly id: string
  readonly sources: readonly JobSourceReference[]
  readonly title: string | null
  readonly company: string | null
  readonly regions: readonly string[] | null
  readonly experienceYears: { readonly min: number | null; readonly max: number | null } | null
  readonly employmentTypes: readonly string[] | null
  readonly skills: readonly string[] | null
  readonly salary: { readonly min: number | null; readonly max: number | null; readonly currency: 'KRW'; readonly period: 'year' | 'month' | 'hour' } | null
  readonly publishedAt: string | null
  readonly updatedAt: string | null
  readonly closesAt: string | null
  readonly collectedAt: string
  readonly contentHash: string
  readonly missingFields: readonly JobFactField[]
}

// Minimal boundary example, not a validator for a complete provider payload.
// Future collectors must validate and map every API field before normalization.
export function parseJobIdentity(input: unknown): JobIdentity {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('Job identity must be an object')
  }
  if (!('source' in input) || (input.source !== 'work24' && input.source !== 'saramin')) {
    throw new TypeError('Unsupported official API source')
  }
  if (!('sourceJobId' in input) || typeof input.sourceJobId !== 'string' || !input.sourceJobId.trim()) {
    throw new TypeError('Source job ID must be a non-empty string')
  }
  return { source: input.source, sourceJobId: input.sourceJobId.trim() }
}
