import type { JobFactField } from './jobs.ts'

export interface AnalysisEvidence {
  readonly criterion: string
  readonly sourceJobId: string
  readonly field: JobFactField
  readonly excerpt: string
  readonly interpretation: string
  readonly origin: 'rule' | 'ai'
  readonly assessment: 'matches' | 'gap' | 'unknown'
}

export type AnalysisResult = {
  readonly jobId: string
  readonly profileVersion: string
  readonly contentHash: string
} & (
  | { readonly status: 'pending' | 'running' }
  | { readonly status: 'on-hold' | 'failed'; readonly reason: string }
  | {
      readonly status: 'completed'
      readonly suitability: 'matches' | 'partial' | 'insufficient-information'
      readonly summary: string
      readonly evidence: readonly AnalysisEvidence[]
      readonly missingInformation: readonly string[]
      readonly questions: readonly string[]
      readonly confidence: 'high' | 'medium' | 'low'
      readonly confidenceReasons: readonly string[]
      readonly analyzedAt: string
      readonly modelVersion: string
      readonly promptVersion: string
      readonly ruleVersion: string
      readonly validation: 'passed'
    }
)
