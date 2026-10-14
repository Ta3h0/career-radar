import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const staged = process.argv.includes('--staged')
const fileArgs = staged
  ? ['ls-files', '--cached', '-z']
  : ['ls-files', '--cached', '--others', '--exclude-standard', '-z']
const paths = [...new Set(execFileSync('git', fileArgs, { encoding: 'utf8' }).split('\0').filter(Boolean))]
const blockedPath = /^(?:\.agents\/skills\/|\.tools\/|\.setup\/|private\/|secrets\/|node_modules\/|dist\/|docs\/skill-(?:migration(?:-manifest)?|validation)\.(?:md|json)$)|(?:^|\/)(?:\.env(?:\..*)?|credentials[^/]*\.json|[^/]*\.(?:pem|key))$/i
const checks = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['access-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|AIza[A-Za-z0-9_-]{30,})\b/],
  ['secret-assignment', /(?:api[_-]?key|access[_-]?token|password|_authToken)\s*[=:]\s*["'][A-Za-z0-9_+./=-]{12,}["']/i],
  ['email-address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ['private-windows-path', /[A-Z]:[\\/](?:Users[\\/](?!Public\b)|[^\\/\r\n]+[\\/]업체별 작업[\\/])/i],
]
const findings = []
for (const path of paths) {
  if (blockedPath.test(path) && !path.endsWith('.env.example')) findings.push({ path, kind: 'excluded-file' })
  let contents
  try {
    contents = staged
      ? execFileSync('git', ['show', `:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      : readFileSync(path, 'utf8')
  } catch {
    findings.push({ path, kind: 'unreadable-file' })
    continue
  }
  for (const [kind, pattern] of checks) if (pattern.test(contents)) findings.push({ path, kind })
}
if (findings.length) {
  for (const finding of findings) console.error(`${finding.kind}: ${finding.path}`)
  process.exitCode = 1
} else console.log(`PASS: ${paths.length} ${staged ? 'staged' : 'publishable'} files checked; local skills and private evidence excluded.`)
