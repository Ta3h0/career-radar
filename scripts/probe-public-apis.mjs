// Authentication-boundary probe only: no keys, no login, no job-page visits.
const endpoints = [
  ['saramin', 'https://oapi.saramin.co.kr/job-search?count=1'],
]
for (const [source, endpoint] of endpoints) {
  try {
    const response = await fetch(endpoint, { headers: { Accept: source === 'saramin' ? 'application/json' : 'application/xml' }, signal: AbortSignal.timeout(20000), redirect: 'error' })
    const text = await response.text()
    const authRejected = /인증|인증키|access[-_.]?key|auth[-_.]?key|unauthori[sz]ed|authentication|invalid key/i.test(text) || [401, 403].includes(response.status)
    console.log(JSON.stringify({ source, httpStatus: response.status, responseType: response.headers.get('content-type'), outcome: authRejected ? 'authentication-required' : 'unclassified-response-no-collection', recordsCollected: 0 }))
  } catch {
    console.log(JSON.stringify({ source, outcome: 'network-or-redirect-failure', recordsCollected: 0 }))
  }
}
