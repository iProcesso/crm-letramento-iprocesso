const TAB = 'Oportunidades';
const AUDIT_TAB = 'Historico';
const HEADERS = ['id','empresa','contato','email','telefone','oferta','evento','responsavel','etapa','temperatura','pessoasPrevistas','pessoasConfirmadas','valorTotal','probabilidade','mesPrevisto','proximaAcao','dataProximaAcao','ultimoContato','origem','observacoes','createdAt','updatedAt','createdBy','updatedBy'];
const AUDIT_HEADERS = ['timestamp','usuario','acao','oportunidadeId','detalhes'];

function doGet() {
  return json_({ ok: true, data: { service: 'CRM Letramento iProcesso', status: 'online', auth: authMode_() } });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const identity = authenticate_(body);
    const action = body.action;
    const payload = body.payload || {};
    if (action === 'list') return json_({ ok: true, data: list_() });
    if (action === 'create') return json_({ ok: true, data: upsert_(payload, false, identity.email) });
    if (action === 'update') return json_({ ok: true, data: upsert_(payload, true, identity.email) });
    if (action === 'delete') return json_({ ok: true, data: remove_(payload.id, identity.email) });
    throw new Error('Ação não reconhecida.');
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function setupCrm() {
  const sheet = sheet_(TAB, HEADERS);
  const audit = sheet_(AUDIT_TAB, AUDIT_HEADERS);
  [sheet, audit].forEach(s => {
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, s.getLastColumn()).setBackground('#e8ece9').setFontColor('#17231d').setFontWeight('bold');
    s.autoResizeColumns(1, s.getLastColumn());
  });
  PropertiesService.getScriptProperties().setProperty('CRM_READY', new Date().toISOString());
}

function authMode_() {
  return (PropertiesService.getScriptProperties().getProperty('AUTH_MODE') || 'google').toLowerCase();
}

function authenticate_(body) {
  if (authMode_() === 'key') {
    const expected = PropertiesService.getScriptProperties().getProperty('CRM_API_KEY');
    if (!expected || !body.key || body.key !== expected) throw new Error('Chave de acesso inválida.');
    return { email: 'acesso-por-chave' };
  }
  if (!body.idToken) throw new Error('Login Google obrigatório.');
  const clientId = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID');
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID não configurado no servidor.');
  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(body.idToken), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) throw new Error('Sessão Google inválida ou expirada. Entre novamente.');
  const token = JSON.parse(response.getContentText());
  if (token.aud !== clientId || String(token.email_verified) !== 'true') throw new Error('Identidade Google não validada.');
  const email = String(token.email || '').toLowerCase();
  const allowed = (PropertiesService.getScriptProperties().getProperty('CRM_ALLOWED_EMAILS') || '')
    .split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) throw new Error('Usuário não autorizado para este CRM.');
  return { email: email };
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Defina SPREADSHEET_ID nas propriedades do script.');
  return SpreadsheetApp.openById(id);
}

function sheet_(name, headers) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function list_() {
  const sheet = sheet_(TAB, HEADERS);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    .filter(row => row[0])
    .map(row => Object.fromEntries(HEADERS.map((h, i) => [h, serialize_(row[i])])))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function upsert_(input, mustExist, email) {
  validate_(input);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_(TAB, HEADERS);
    const ids = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(String(input.id));
    if (mustExist && index < 0) throw new Error('Oportunidade não encontrada. Sincronize e tente novamente.');
    const now = new Date().toISOString();
    const current = index >= 0 ? Object.fromEntries(HEADERS.map((h, i) => [h, sheet.getRange(index + 2, i + 1).getValue()])) : {};
    const record = { ...current, ...input, createdAt: current.createdAt || input.createdAt || now, updatedAt: now, createdBy: current.createdBy || email, updatedBy: email };
    const row = HEADERS.map(h => record[h] == null ? '' : record[h]);
    if (index >= 0) sheet.getRange(index + 2, 1, 1, HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    audit_(email, index >= 0 ? 'update' : 'create', input.id, { etapa: record.etapa, empresa: record.empresa });
    return record;
  } finally { lock.releaseLock(); }
}

function remove_(id, email) {
  if (!id) throw new Error('ID obrigatório.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_(TAB, HEADERS);
    if (sheet.getLastRow() < 2) throw new Error('Oportunidade não encontrada.');
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().flat();
    const index = ids.indexOf(String(id));
    if (index < 0) throw new Error('Oportunidade não encontrada.');
    audit_(email, 'delete', id, { row: index + 2 });
    sheet.deleteRow(index + 2);
    return { id: id, deleted: true };
  } finally { lock.releaseLock(); }
}

function audit_(email, action, id, details) {
  sheet_(AUDIT_TAB, AUDIT_HEADERS).appendRow([new Date().toISOString(), email, action, id, JSON.stringify(details || {})]);
}

function validate_(o) {
  ['id','empresa','oferta','responsavel','etapa'].forEach(k => { if (!o[k]) throw new Error('Campo obrigatório: ' + k); });
  const allowed = ['Lead','Contato iniciado','Diagnóstico','Proposta enviada','Negociação','Confirmada','Perdida'];
  if (!allowed.includes(o.etapa)) throw new Error('Etapa inválida.');
  if (o.temperatura && !['Quente','Morno','Frio'].includes(o.temperatura)) throw new Error('Temperatura inválida.');
}

function serialize_(v) {
  return Object.prototype.toString.call(v) === '[object Date]'
    ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
