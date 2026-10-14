export interface PreferenceSet {
  readonly roles: readonly string[]
  readonly regions: readonly string[]
  readonly employmentTypes: readonly string[]
  readonly skills: readonly string[]
  readonly annualSalaryMinKrw: number | null
}

// Contains comparison conditions only. Contact details and resumes belong
// in a separately protected server store, never in fixtures or UI bundles.
export interface UserProfile {
  readonly id: string
  readonly version: string
  readonly experienceYears: number | null
  readonly required: PreferenceSet
  readonly preferred: PreferenceSet
  readonly excludedKeywords: readonly string[]
  readonly updatedAt: string
}
