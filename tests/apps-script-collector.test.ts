import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { documentationExample } from './fixtures/saramin-documentation.ts'
import { normalizeSaraminPage } from '../server/collectors/saramin-normalize.ts'

// Also works after a clean clone: package using the installed TypeScript only.
execFileSync(process.execPath, ['scripts/build-apps-script.mjs'])
const core = readFileSync('.setup/apps-script/Core.gs', 'utf8')
const adapter = readFileSync('automation/apps-script/Collector.gs', 'utf8')
const empty = { roles: [], regions: [], skills: [], employmentTypes: [], annualSalaryMinKrw: null }
function harness(options: { enabled?: boolean; locked?: boolean; budget?: number; flushFails?: boolean; pilot?: boolean } = {}) {
  const props = new Map<string, string>([
    ['SARAMIN_ENABLED', options.enabled === false ? 'false' : 'true'],
    ['SARAMIN_APPROVED', 'true'], ['SARAMIN_USAGE_REVIEWED', 'true'], ['ZERO_COST_CONFIRMED', 'true'],
    ['SARAMIN_ACCESS_KEY', 'demo'], ['SARAMIN_KEYWORDS', '문서 예시'],
    ['SARAMIN_PROFILE_JSON', JSON.stringify({ id: 'synthetic', version: 'v1', experienceYears: null, required: empty, preferred: empty, excludedKeywords: [], updatedAt: '2026-10-14T00:00:00Z' })],
    ['SARAMIN_PILOT_VERIFIED', options.pilot ? 'true' : 'false'],
    ['SARAMIN_REQUEST_BUDGET', JSON.stringify({ since: Date.now(), used: options.budget ?? 0 })],
  ])
  const rows: string[][] = []
  const effects = { fetches: 0, triggers: 0, releases: 0, failFlush: options.flushFails ?? false }
  const logs: string[] = []
  const sheet = { getLastRow: () => rows.length, appendRow: (row: string[]) => { rows.push(row) }, getRange: () => ({ getValues: () => rows }) }
  const builder = { timeBased: () => builder, atHour: () => builder, everyDays: () => builder, inTimezone: () => builder, create: () => { effects.triggers++ } }
  const api = runInNewContext(core + '\n' + adapter + '\n({runDailySaramin, createDailySaraminTrigger})', {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => props.get(key) ?? null, setProperty: (key: string, value: string) => props.set(key, value) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => !options.locked, releaseLock: () => { effects.releases++ } }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }), flush: () => { if (effects.failFlush) throw new Error('ambiguous commit') } },
    UrlFetchApp: { fetch: () => {
      effects.fetches++
      // Transport scenario adapts the sample's unrelated total/page metadata.
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ jobs: { ...documentationExample.jobs, start: 0, total: '2' } }) }
    } },
    Utilities: { sleep: () => undefined, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (_algorithm: string, input: string) => [...createHash('sha256').update(input).digest()].map((byte) => byte > 127 ? byte - 256 : byte) },
    ScriptApp: { getProjectTriggers: () => effects.triggers ? [{ getHandlerFunction: () => 'runDailySaramin' }] : [], newTrigger: () => builder },
    console: { log: (value: string) => { logs.push(value) } },
    // No Node, URL, fetch, Buffer, environment or actual Google services in VM.
  }) as { runDailySaramin(): { status: string; recordsCollected: number; changed?: number }; createDailySaraminTrigger(): { status: string } }
  return { api, rows, props, effects, logs }
}

describe('built GAS collector: simulated Google services, not deployment', () => {
  it('executes bundled normalizer with the native-digest adapter and replays its journal', () => {
    const { api, rows, props, effects, logs } = harness()
    expect(api.runDailySaramin().status).toBe('COMPLETE_WINDOW')
    const batch = JSON.parse(rows[0]![0]!) as { jobs: { id: string; contentHash: string }[] }
    const expected = normalizeSaraminPage(documentationExample, '2026-10-14T00:00:00Z').jobs
    for (const job of batch.jobs) expect(job.contentHash).toBe(expected.find((item) => item.id === job.id)?.contentHash)
    expect(api.runDailySaramin().changed).toBe(0)
    expect(rows).toHaveLength(2)
    expect(JSON.parse(props.get('SARAMIN_LAST_RUN')!)).not.toHaveProperty('state')
    expect(effects.fetches).toBe(2)
    expect(effects.releases).toBe(2)
    expect(logs).toHaveLength(2)
    for (const line of logs) {
      expect(line).not.toContain('access-key')
      expect(line).not.toContain('demo')
      expect(line).not.toContain('문서 예시')
      expect(JSON.parse(line)).not.toHaveProperty('state')
    }
  })
  it('makes no HTTP request while disabled, locked or over its persisted quota', () => {
    for (const options of [{ enabled: false }, { locked: true }, { budget: 20 }]) {
      const { api, effects } = harness(options)
      expect(api.runDailySaramin().recordsCollected).toBe(0)
      expect(effects.fetches).toBe(0)
    }
  })
  it('recovers an ambiguous append/flush failure by replay without duplicate candidates', () => {
    const { api, effects, rows } = harness({ flushFails: true })
    expect(api.runDailySaramin().status).toBe('FAILED_STORAGE_REPLAY_REQUIRED')
    expect(rows).toHaveLength(1)
    effects.failFlush = false
    expect(api.runDailySaramin().changed).toBe(0)
  })
  it('requires a successful manual pilot before configuring one daily trigger', () => {
    const held = harness()
    expect(held.api.createDailySaraminTrigger().status).toBe('HOLD_MANUAL_PILOT_REQUIRED')
    expect(held.effects.triggers).toBe(0)
    const ready = harness({ pilot: true })
    expect(ready.api.createDailySaraminTrigger().status).toBe('CONFIGURED')
    expect(ready.api.createDailySaraminTrigger().status).toBe('ALREADY_CONFIGURED')
    expect(ready.effects.triggers).toBe(1)
  })
})
