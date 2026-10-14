// Phase 3 readiness check only. This is NOT a live collector or AI runner.
// Copy into a script bound to the owner's private Google Sheet.
function recordAutomationReadiness() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'LOCKED', recordsCollected: 0 };
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('A private bound spreadsheet is required');
    let sheet = spreadsheet.getSheetByName('AutomationReadiness');
    if (!sheet) {
      sheet = spreadsheet.insertSheet('AutomationReadiness');
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['run_key', 'checked_at_kst', 'status', 'records_collected']);
    }
    const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const key = 'readiness:' + today;
    const count = sheet.getLastRow() - 1;
    const existing = count > 0 ? sheet.getRange(2, 1, count, 1).getDisplayValues() : [];
    if (existing.some(function (row) { return row[0] === key; })) return { status: 'ALREADY_RECORDED', recordsCollected: 0 };
    const properties = PropertiesService.getScriptProperties();
    const status = properties.getProperty('SARAMIN_APPROVED') === 'true'
      ? 'HOLD_USE_SEPARATE_COLLECTOR_SETUP'
      : 'HOLD_API_APPROVAL_REQUIRED';
    sheet.appendRow([key, Utilities.formatDate(new Date(), 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ss"), status, 0]);
    return { status: status, recordsCollected: 0 };
  } finally { lock.releaseLock(); }
}

// Invoke manually only after reviewing the private-sheet setup instructions.
function createDailyReadinessTrigger() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'LOCKED' };
  try {
    const handler = 'recordAutomationReadiness';
    const exists = ScriptApp.getProjectTriggers().some(function (trigger) { return trigger.getHandlerFunction() === handler; });
    if (exists) return { status: 'ALREADY_CONFIGURED' };
    ScriptApp.newTrigger(handler).timeBased().atHour(9).everyDays(1).inTimezone('Asia/Seoul').create();
    return { status: 'CONFIGURED_READINESS_ONLY' };
  } finally { lock.releaseLock(); }
}
