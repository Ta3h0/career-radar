import { prepareSaraminBatch } from './pipeline/prepare.ts'
import type { UserProfile } from '../src/domain/profile.ts'

// Entirely synthetic developer data, never a user's profile or live job.
const conditions = { roles: [], regions: [], employmentTypes: [], skills: [], annualSalaryMinKrw: null }
const profile: UserProfile = { id: 'synthetic-profile', version: 'synthetic-v1', experienceYears: null, required: conditions, preferred: conditions, excludedKeywords: [], updatedAt: '2026-10-14T00:00:00Z' }
const raw = { jobs: { count: 2, start: 0, total: '2', job: [1, 1].map((id) => ({ id, active: 1, url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`, company: { detail: { name: '합성 테스트 기업' } }, position: { title: '합성 테스트 공고', location: { name: '서울 > 테스트구' } } })) } }
const first = prepareSaraminBatch(raw, profile, '2026-10-14T00:00:00Z')
const repeat = prepareSaraminBatch(raw, profile, '2026-10-15T00:00:00Z', first.nextHashes)
console.log(JSON.stringify({ mode: 'synthetic-only', normalizedInputs: 2, uniqueJobs: first.jobs.length, firstRunChanges: first.changedJobIds.length, repeatRunChanges: repeat.changedJobIds.length, analysisStatus: first.analysisStatus, actualApiRecords: 0, sentEmails: 0 }, null, 2))
