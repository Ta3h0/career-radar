// Copy ONLY after reviewing docs/saramin-operations.md. Not deployed by npm.
// Core.gs is built from the same TypeScript that the offline tests exercise.
function runDailySaramin() {
  var summary = executeSaraminCollection_();
  console.log(JSON.stringify(summary));
  return summary;
}

function executeSaraminCollection_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'LOCKED', recordsCollected: 0 };
  try {
    var properties = PropertiesService.getScriptProperties();
    var config = {
      enabled: properties.getProperty('SARAMIN_ENABLED') === 'true',
      approved: properties.getProperty('SARAMIN_APPROVED') === 'true',
      usageReviewed: properties.getProperty('SARAMIN_USAGE_REVIEWED') === 'true',
      freeOnly: properties.getProperty('ZERO_COST_CONFIRMED') === 'true',
      key: properties.getProperty('SARAMIN_ACCESS_KEY') || undefined,
      pageSize: 5, maxRequests: 3,
      keywords: properties.getProperty('SARAMIN_KEYWORDS') || undefined
    };
    if (!config.enabled || !config.approved || !config.usageReviewed || !config.freeOnly || !config.key) {
      return { status: 'HOLD_APPROVAL_CONFIGURATION', recordsCollected: 0 };
    }
    var profileText = properties.getProperty('SARAMIN_PROFILE_JSON');
    if (!profileText) return { status: 'HOLD_CONDITIONS_REQUIRED', recordsCollected: 0 };
    var profile = CareerRadar.parseCollectionProfile(JSON.parse(profileText));
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) return { status: 'HOLD_PRIVATE_BOUND_SHEET_REQUIRED', recordsCollected: 0 };
    var sheet = spreadsheet.getSheetByName('SaraminJournal') || spreadsheet.insertSheet('SaraminJournal');
    var rowCount = sheet.getLastRow();
    // Pilot ceiling: stop rather than auto-delete data or buy capacity.
    if (rowCount >= 200) return { status: 'HOLD_STORAGE_RETENTION_REVIEW', recordsCollected: 0 };
    var state = CareerRadar.emptyCollectionState();
    if (rowCount) {
      sheet.getRange(1, 1, rowCount, 1).getValues().forEach(function(row) {
        state = CareerRadar.applyCommit(state, JSON.parse(row[0]));
      });
    }
    var result = CareerRadar.runSaraminCollection(config, profile, state, new Date().toISOString(), {
      reserveRequest: function() {
        var budget = JSON.parse(properties.getProperty('SARAMIN_REQUEST_BUDGET') || '{"since":0,"used":0}');
        var now = Date.now();
        if (now - budget.since >= 86400000) budget = { since: now, used: 0 };
        if (!Number.isFinite(budget.since) || !Number.isInteger(budget.used) || budget.used < 0 || budget.used >= 20) return false;
        budget.used++;
        properties.setProperty('SARAMIN_REQUEST_BUDGET', JSON.stringify(budget));
        return true;
      },
      request: function(url) {
        var response = UrlFetchApp.fetch(url, { method: 'get', headers: { Accept: 'application/json' }, muteHttpExceptions: true, followRedirects: false, validateHttpsCertificates: true });
        return { status: response.getResponseCode(), body: response.getContentText() };
      },
      commit: function(batch) {
        sheet.appendRow([JSON.stringify(batch)]);
        SpreadsheetApp.flush();
      },
      pause: function(milliseconds) { Utilities.sleep(milliseconds); }
    });
    // Never return the state, titles, conditions, endpoint or credentials to logs.
    var summary = { status: result.status, requestsUsed: result.requestsUsed, recordsCollected: result.recordsCollected, changed: result.changed, aiCalls: 0, mailsSent: 0 };
    properties.setProperty('SARAMIN_LAST_RUN', JSON.stringify(summary));
    return summary;
  } catch (_) {
    // Native URL Fetch errors can contain an access-key query string.
    return { status: 'FAILED_PRIVATE_CONFIGURATION_OR_STORAGE', recordsCollected: 0 };
  } finally { lock.releaseLock(); }
}

function createDailySaraminTrigger() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { status: 'LOCKED' };
  try {
    var properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('SARAMIN_ENABLED') !== 'true' || properties.getProperty('SARAMIN_PILOT_VERIFIED') !== 'true') return { status: 'HOLD_MANUAL_PILOT_REQUIRED' };
    var handler = 'runDailySaramin';
    if (ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === handler; })) return { status: 'ALREADY_CONFIGURED' };
    ScriptApp.newTrigger(handler).timeBased().atHour(9).everyDays(1).inTimezone('Asia/Seoul').create();
    return { status: 'CONFIGURED' };
  } finally { lock.releaseLock(); }
}
