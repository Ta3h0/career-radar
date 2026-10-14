import { describe, expect, it } from 'vitest'
import { prepareOfficialEmailReferences } from '../server/collectors/official-email.ts'

describe('official email fallback: synthetic links only, no mailbox or network', () => {
  const link = 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=101'
  it('holds without consent or upstream sender verification', () => {
    expect(prepareOfficialEmailReferences({ consented: false, senderVerified: true, candidateLinks: [link] }).references).toEqual([])
    expect(prepareOfficialEmailReferences({ consented: true, senderVerified: false, candidateLinks: [link] }).references).toEqual([])
  })
  it('deduplicates direct official links, strips tracking and never trusts redirect URLs', () => {
    const result = prepareOfficialEmailReferences({ consented: true, senderVerified: true, candidateLinks: [link, link + '&untrusted=value', 'https://tracking.invalid/redirect?url=' + encodeURIComponent(link), 'javascript:alert(1)', 'https://www.saramin.co.kr.attacker.invalid/'] })
    expect(result.references).toEqual([{ origin: 'official-alert-email', originalUrl: link, metadataStatus: 'unverified' }])
    expect(result.status).toBe('references-only-not-api-collection')
  })
})
