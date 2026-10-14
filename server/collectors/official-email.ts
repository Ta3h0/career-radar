import { officialSaraminUrl } from './saramin-normalize.ts'

// Pure reference parser only. No inbox access, body retention, tracking-link
// following or HTML fetching. Sender authenticity must be established upstream.
export function prepareOfficialEmailReferences(input: {
  consented: boolean
  senderVerified: boolean
  candidateLinks: readonly string[]
}) {
  if (!input.consented || !input.senderVerified) return { status: 'hold-consent-or-sender-verification' as const, references: [] }
  if (!Array.isArray(input.candidateLinks) || input.candidateLinks.length > 100) throw new TypeError('Invalid email link boundary')
  const links = new Set<string>()
  for (const link of input.candidateLinks) {
    if (typeof link !== 'string' || link.length > 2000) continue
    try {
      const originalUrl = officialSaraminUrl(link)
      const id = /[?&]rec_idx=(\d+)/u.exec(originalUrl)?.[1]
      if (id) links.add(`https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`)
    } catch { /* Opaque tracking/redirect links require manual review, never fetch. */ }
  }
  return {
    status: 'references-only-not-api-collection' as const,
    references: [...links].map((url) => ({ origin: 'official-alert-email' as const, originalUrl: url, metadataStatus: 'unverified' as const })),
  }
}
