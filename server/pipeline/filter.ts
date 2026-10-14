import type { JobPosting } from '../../src/domain/jobs.ts'
import type { UserProfile } from '../../src/domain/profile.ts'
import type { FilterDecision } from './contracts.ts'

const norm = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('en-US')

export function evaluateConditions(job: JobPosting, profile: UserProfile): FilterDecision {
  const reasons: string[] = []
  const unknownFields: string[] = []
  const required = profile.required
  for (const set of [required, profile.preferred]) {
    for (const values of [set.roles, set.regions, set.employmentTypes, set.skills]) {
      if (!Array.isArray(values) || values.some((value: unknown) => typeof value !== 'string' || !value.trim())) throw new TypeError('Invalid condition values')
    }
  }
  if (profile.excludedKeywords.some((value) => !value.trim())) throw new TypeError('Empty excluded keyword')
  const oneOf = (field: 'roles' | 'regions' | 'employmentTypes', desired: readonly string[], actual: readonly string[] | null) => {
    if (!desired.length) return
    if (!actual?.length) { unknownFields.push(field); return }
    const matches = desired.some((wanted) => actual.some((value) => field === 'regions'
      ? norm(value) === norm(wanted) || norm(value).startsWith(`${norm(wanted)} >`)
      : norm(value) === norm(wanted)))
    if (!matches) reasons.push(`${field}:required-condition-not-met`)
  }
  oneOf('roles', required.roles, job.roles)
  oneOf('regions', required.regions, job.regions)
  oneOf('employmentTypes', required.employmentTypes, job.employmentTypes)
  if (required.skills.length) {
    if (!job.skills?.length) unknownFields.push('skills')
    else if (!required.skills.every((skill) => job.skills?.some((value) => norm(value) === norm(skill)))) reasons.push('skills:required-condition-not-met')
  }
  const threshold = required.annualSalaryMinKrw
  if (threshold !== null) {
    if (!Number.isFinite(threshold) || threshold < 0) throw new TypeError('Invalid annual salary condition')
    if (!job.salary || job.salary.period !== 'year' || job.salary.min === null) unknownFields.push('salary')
    else if (job.salary.min < threshold) {
      if (job.salary.max !== null && job.salary.max < threshold) reasons.push('salary:below-required-minimum')
      else unknownFields.push('salary')
    }
  }
  if (profile.experienceYears !== null) {
    if (!Number.isFinite(profile.experienceYears) || profile.experienceYears < 0) throw new TypeError('Invalid experience condition')
    if (!job.experienceYears || job.experienceYears.min === null) unknownFields.push('experienceYears')
    else if (job.experienceYears.min > profile.experienceYears) reasons.push('experienceYears:below-required-minimum')
    else if (job.experienceYears.max !== null && profile.experienceYears > job.experienceYears.max) reasons.push('experienceYears:above-required-maximum')
  }
  if (profile.excludedKeywords.length) {
    const availableText = [job.title, job.company, ...(job.roles ?? [])].filter(Boolean).join(' ').toLocaleLowerCase('en-US')
    if (profile.excludedKeywords.some((keyword) => availableText.includes(norm(keyword)))) reasons.push('excluded-keyword:present-in-metadata')
    else unknownFields.push('fullBodyForExcludedKeywords')
  }
  // Preferred conditions never become hard exclusions.
  return { jobId: job.id, decision: reasons.length ? 'exclude' : unknownFields.length ? 'needs-review' : 'include', reasons, unknownFields }
}
