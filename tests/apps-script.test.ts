import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

function harness(options: { locked?: boolean; approved?: boolean; triggerExists?: boolean; writeFailure?: boolean } = {}) {
  const rows: unknown[][] = []
  const state = { released: 0, createdTriggers: 0 }
  const sheet = {
    appendRow(row: unknown[]) { if (options.writeFailure) throw new Error('Synthetic write failure'); rows.push(row) },
    getLastRow: () => rows.length,
    getRange: () => ({ getDisplayValues: () => rows.slice(1).map((row) => [row[0]]) }),
  }
  let inserted = false
  const builder = { timeBased: () => builder, atHour: () => builder, everyDays: () => builder, inTimezone: () => builder, create: () => { state.createdTriggers++ } }
  const context = {
    LockService: { getScriptLock: () => ({ tryLock: () => !options.locked, releaseLock: () => { state.released++ } }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => inserted ? sheet : null, insertSheet: () => { inserted = true; return sheet } }) },
    Utilities: { formatDate: () => '2026-10-14' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => options.approved ? 'true' : null }) },
    ScriptApp: { getProjectTriggers: () => options.triggerExists || state.createdTriggers ? [{ getHandlerFunction: () => 'recordAutomationReadiness' }] : [], newTrigger: () => builder },
  }
  const api = runInNewContext(readFileSync('automation/apps-script/Bootstrap.gs', 'utf8') + '\n({recordAutomationReadiness, createDailyReadinessTrigger})', context) as {
    recordAutomationReadiness(): { status: string; recordsCollected: number }
    createDailyReadinessTrigger(): { status: string }
  }
  return { api, state, rows }
}

describe('Apps Script readiness harness: simulated services only', () => {
  it('records a hold with zero jobs and is idempotent for the same day', () => {
    const { api, rows, state } = harness()
    expect(api.recordAutomationReadiness().status).toBe('HOLD_API_APPROVAL_REQUIRED')
    expect(api.recordAutomationReadiness().status).toBe('ALREADY_RECORDED')
    expect(rows).toHaveLength(2)
    expect(state.released).toBe(2)
  })
  it('does not claim collection even when an approval flag is configured', () => {
    const { api } = harness({ approved: true })
    expect(api.recordAutomationReadiness()).toEqual({ status: 'HOLD_USE_SEPARATE_COLLECTOR_SETUP', recordsCollected: 0 })
  })
  it('skips overlapping execution', () => {
    const { api, rows, state } = harness({ locked: true })
    expect(api.recordAutomationReadiness().status).toBe('LOCKED')
    expect(rows).toHaveLength(0)
    expect(state.released).toBe(0)
  })
  it('releases the lock after a storage error', () => {
    const { api, state } = harness({ writeFailure: true })
    expect(() => api.recordAutomationReadiness()).toThrow('Synthetic write failure')
    expect(state.released).toBe(1)
  })
  it('creates at most one readiness trigger', () => {
    const { api, state } = harness()
    expect(api.createDailyReadinessTrigger().status).toBe('CONFIGURED_READINESS_ONLY')
    expect(api.createDailyReadinessTrigger().status).toBe('ALREADY_CONFIGURED')
    expect(state.createdTriggers).toBe(1)
  })
})
