const TAB = 'Oportunidades';
const HEADERS = ['id','empresa','contato','email','telefone','oferta','evento','responsavel','etapa','pessoasPrevistas','pessoasConfirmadas','valorTotal','probabilidade','mesPrevisto','proximaAcao','dataProximaAcao','ultimoContato','origem','observacoes','createdAt','updatedAt'];

function doGet() {
  return json_({ ok: true, data: { service: 'CRM Letramento iProcesso', status: 'online' } });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    authenticate_(body.key);
    const action = body.action;
    const payload = body.payload || {};
    if (action === 'list') return json_({ ok: true, data: list_() });
    if (action === 'create') return json_({ ok: true, data: upsert_(payload, false) });
    if (action === 'update') return json_({ ok: true, data: upsert_(payload, true) });
    if (action === 'delete') return json_({ ok: true, data: remove_(payload.id) });
    throw new Error('Ação não reconhecida.');
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function setupCrm() {
  const sheet = sheet_();
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#12372a').setFontColor('#ffffff').setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);
  PropertiesService.getScriptProperties().setProperty('CRM_READY', new Date().toISOString());
}

function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Defina SPREADSHEET_ID nas propriedades do script.');
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName(TAB);
  if (!sheet) {
    sheet = ss.insertSheet(TAB);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function authenticate_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('CRM_API_KEY');
  if (!expected || !key || key !== expected) throw new Error('Chave de acesso inválida.');
}

function list_() {
  const sheet = sheet_();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    .filter(row => row[0])
    .map(row => Object.fromEntries(HEADERS.map((h, i) => [h, serialize_(row[i])])))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function upsert_(input, mustExist) {
  validate_(input);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(String(input.id));
    if (mustExist && index < 0) throw new Error('Oportunidade não encontrada. Sincronize e tente novamente.');
    const now = new Date().toISOString();
    const current = index >= 0 ? Object.fromEntries(HEADERS.map((h, i) => [h, sheet.getRange(index + 2, i + 1).getValue()])) : {};
    const record = { ...current, ...input, createdAt: current.createdAt || input.createdAt || now, updatedAt: now };
    const row = HEADERS.map(h => record[h] == null ? '' : record[h]);
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    return record;
  } finally { lock.releaseLock(); }
}

function remove_(id) {
  if (!id) throw new Error('ID obrigatório.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    if (sheet.getLastRow() < 2) throw new Error('Oportunidade não encontrada.');
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(String(id));
    if (index < 0) throw new Error('Oportunidade não encontrada.');
    sheet.deleteRow(index + 2);
    return { id: id, deleted: true };
  } finally { lock.releaseLock(); }
}

function validate_(o) {
  ['id','empresa','oferta','responsavel','etapa'].forEach(k => { if (!o[k]) throw new Error('Campo obrigatório: ' + k); });
  const allowed = ['Lead','Contato iniciado','Diagnóstico','Proposta enviada','Negociação','Confirmada','Perdida'];
  if (!allowed.includes(o.etapa)) throw new Error('Etapa inválida.');
}

function serialize_(v) {
  return Object.prototype.toString.call(v) === '[object Date]'
    ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
