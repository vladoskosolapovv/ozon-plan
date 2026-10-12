/**
 * План продаж Ozon — серверная часть (Google Apps Script).
 * Данные хранятся в этой же Google-таблице:
 *   months   — план месяца (одна строка на месяц, JSON)
 *   facts    — факт периода (одна строка на неделю, JSON из выгрузок)
 *   История  — читаемая сводка план/факт по месяцам (пишет сайт при сохранении)
 */

const SHEET_MONTHS = 'months';
const SHEET_FACTS = 'facts';
const SHEET_HISTORY = 'История';
const CHUNK = 45000; // лимит ячейки 50 000 символов, режем JSON на куски

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('План продаж Ozon')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- служебное ---------- */

function sheet_(name, header) {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}

function monthsSheet_() { return sheet_(SHEET_MONTHS, ['id', 'updatedAt', 'json']); }
function factsSheet_() { return sheet_(SHEET_FACTS, ['id', 'month', 'period', 'updatedAt', 'json']); }

function chunks_(json) {
  // режем так, чтобы кусок не начинался с символа, который таблица примет за формулу или число
  const out = [];
  let i = 0;
  while (i < json.length) {
    let end = Math.min(i + CHUNK, json.length);
    while (end < json.length && /[=+\-@0-9.\s]/.test(json.charAt(end))) end++;
    out.push(json.slice(i, end));
    i = end;
  }
  return out.length ? out : [''];
}

function readRows_(s, jsonCol) {
  const last = s.getLastRow();
  if (last < 2) return [];
  const width = Math.max(s.getLastColumn(), jsonCol);
  const values = s.getRange(2, 1, last - 1, width).getDisplayValues();
  return values
    .filter(r => r[0] !== '')
    .map(r => ({ id: String(r[0]), json: r.slice(jsonCol - 1).join('') }));
}

function findRow_(s, id) {
  const last = s.getLastRow();
  if (last < 2) return -1;
  const ids = s.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function upsert_(s, id, meta, json, jsonCol) {
  JSON.parse(json); // не пишем битые данные
  const parts = chunks_(json);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let row = findRow_(s, id);
    if (row < 0) row = s.getLastRow() + 1;
    const values = [id].concat(meta, parts);
    if (s.getMaxColumns() < values.length) {
      s.insertColumnsAfter(s.getMaxColumns(), values.length - s.getMaxColumns());
    }
    const width = Math.max(s.getLastColumn(), values.length);
    s.getRange(row, 1, 1, width).clearContent();
    s.getRange(row, jsonCol, 1, values.length - jsonCol + 1).setNumberFormat('@');
    s.getRange(row, 1, 1, 1).setNumberFormat('@');
    s.getRange(row, 1, 1, values.length).setValues([values]);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- API для сайта ---------- */

function loadAll() {
  const out = { months: {}, facts: {} };
  readRows_(monthsSheet_(), 3).forEach(x => {
    try { out.months[x.id] = JSON.parse(x.json); } catch (e) { /* пропускаем битую строку */ }
  });
  readRows_(factsSheet_(), 5).forEach(x => {
    try { out.facts[x.id] = JSON.parse(x.json); } catch (e) { /* пропускаем битую строку */ }
  });
  return JSON.stringify(out);
}

function saveMonth(id, json) {
  upsert_(monthsSheet_(), id, [new Date()], json, 3);
  return true;
}

function saveFact(id, month, period, json) {
  upsert_(factsSheet_(), id, [month, period, new Date()], json, 5);
  return true;
}

function deleteFact(id) {
  const s = factsSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = findRow_(s, id);
    if (row > 0) s.deleteRow(row);
  } finally {
    lock.releaseLock();
  }
  return true;
}

function deleteMonth(id) {
  const s = monthsSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const row = findRow_(s, id);
    if (row > 0) s.deleteRow(row);
  } finally {
    lock.releaseLock();
  }
  return true;
}

function importAll(json) {
  const data = JSON.parse(json);
  Object.keys(data.months || {}).forEach(id => saveMonth(id, JSON.stringify(data.months[id])));
  Object.keys(data.facts || {}).forEach(id => {
    const f = data.facts[id];
    saveFact(id, f.month || '', f.period || '', JSON.stringify(f));
  });
  return true;
}

function saveHistory(json) {
  const rows = JSON.parse(json);
  const header = ['Месяц', 'Дней с данными', 'Дней в месяце', 'План заказы, ₽', 'Факт заказы, ₽',
    '% к плану на дату', 'Прогноз / итог, ₽', '% от плана месяца', 'План ЧП, ₽', 'Факт ЧП, ₽',
    '% ЧП к плану на дату', 'Рента факт', 'Обновлено'];
  const s = sheet_(SHEET_HISTORY, header);
  const last = s.getLastRow();
  if (last > 1) s.getRange(2, 1, last - 1, header.length).clearContent();
  if (!rows.length) return true;
  const now = new Date();
  const values = rows.map(r => [r.month, r.loaded, r.days, r.planRub, r.factRub, r.pct, r.forecast,
    r.pctMonth, r.planChp, r.factChp, r.pctChp, r.rent, now]);
  s.getRange(2, 1, values.length, header.length).setValues(values);
  s.getRange(2, 1, values.length, 1).setNumberFormat('@');
  s.getRange(2, 4, values.length, 2).setNumberFormat('#,##0');
  s.getRange(2, 6, values.length, 1).setNumberFormat('0%');
  s.getRange(2, 7, values.length, 1).setNumberFormat('#,##0');
  s.getRange(2, 8, values.length, 1).setNumberFormat('0%');
  s.getRange(2, 9, values.length, 2).setNumberFormat('#,##0');
  s.getRange(2, 11, values.length, 2).setNumberFormat('0%');
  s.getRange(2, 13, values.length, 1).setNumberFormat('dd.MM.yyyy HH:mm');
  return true;
}

function backupToDrive() {
  const name = 'План продаж Ozon — копия ' +
    Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd HH-mm') + '.json';
  const file = DriveApp.createFile(name, loadAll(), MimeType.PLAIN_TEXT);
  return file.getUrl();
}
