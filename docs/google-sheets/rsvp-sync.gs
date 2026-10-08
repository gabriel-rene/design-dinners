/**
 * Design Dinners — RSVP sync for Google Sheets.
 *
 * Pulls every RSVP from designdinners.com and rewrites the "Reservas" tab.
 * Setup steps: docs/google-sheets-rsvps.md in the design-dinners repo.
 *
 * The token lives in Script Properties (key RSVP_EXPORT_TOKEN), never in
 * this code, so the code is safe to share.
 */
var FEED_URL = 'https://designdinners.com/api/rsvps/export';
var SHEET_NAME = 'Reservas';

/** Runs once: makes the 5-minute timer. Safe to run again. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncRsvps') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncRsvps').timeBased().everyMinutes(5).create();
  syncRsvps();
}

function syncRsvps() {
  var token = PropertiesService.getScriptProperties().getProperty('RSVP_EXPORT_TOKEN');
  if (!token) throw new Error('Falta RSVP_EXPORT_TOKEN en Script Properties.');

  var res = UrlFetchApp.fetch(FEED_URL, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('El sitio respondió ' + res.getResponseCode() + '. Revisa el token.');
  }
  var data = JSON.parse(res.getContentText());

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  var values = [data.header].concat(data.rows);

  sheet.clearContents();
  sheet.getRange(1, 1, values.length, data.header.length).setNumberFormat('@').setValues(values);
  sheet.getRange(1, 1, 1, data.header.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange(1, data.header.length + 2).setValue(
    'Actualizado: ' + Utilities.formatDate(new Date(), 'America/Puerto_Rico', 'yyyy-MM-dd HH:mm')
  );
}
