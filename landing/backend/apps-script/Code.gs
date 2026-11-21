/**
 * Hi · Lista de acesso antecipado + promoção "3 amigos, 1 semestre grátis"
 *
 * Backend do MVP, em Google Apps Script ligado a uma planilha do Google.
 * Grava cada inscrição, conta as indicações e, quando alguém chega a 3 indicados,
 * manda UM e-mail para o dono avisando. Passo a passo em README.md.
 *
 * Contrato com a landing (landing/config.js → endpoint):
 *   recebe  POST (corpo JSON, enviado como text/plain para evitar preflight de CORS):
 *           { email, name, level, ref, source, createdAt }
 *   devolve { ok: true, referralCode: "ANA-K7M2" }   ou   { ok: false, error: "..." }
 *   (o Apps Script sempre responde HTTP 200; o erro vem no campo "ok")
 *
 * Regras:
 *   - Um e-mail entra uma vez só. Reenviar devolve o mesmo código e NÃO conta de novo.
 *   - "a.na+qualquer@gmail.com" e "ana@gmail.com" são a mesma pessoa.
 *   - Auto-indicação (mesmo e-mail do dono do código) é ignorada.
 *   - O aviso por e-mail sai uma única vez por pessoa, ao atingir THRESHOLD indicados.
 *   - ATENÇÃO: a contagem é por CADASTRO pela lista, não por "conta ativada" no app.
 *     O e-mail de aviso lista os indicados para você conferir antes de liberar o semestre.
 */

var SHEET_NAME = "Leads";
var HEADERS = ["createdAt", "email", "emailKey", "name", "level", "source", "referralCode", "referredBy", "referralCount", "notifiedAt"];
var COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i; });
var THRESHOLD = 3;
var LEVELS = ["A1", "A2", "B1", "B2", "C1", "nao-sei"];
var SOURCES = ["landing-acesso-antecipado", "landing-promocao"];
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/* ===================== Lógica (sem APIs do Google, testável no Node) ===================== */

/** Chave de comparação: minúsculas, sem "+tag" e, no Gmail, sem pontos. */
function emailKey(email) {
  var e = String(email).trim().toLowerCase();
  var at = e.lastIndexOf("@");
  var local = e.slice(0, at);
  var domain = e.slice(at + 1);
  var plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return local + "@" + domain;
}

/** Evita que a planilha trate o texto como fórmula (=, +, -, @ no começo). */
function safeCell(text) {
  var s = String(text == null ? "" : text);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function validate(p) {
  if (!p || typeof p !== "object") return { ok: false, error: "Pedido inválido." };
  var email = String(p.email == null ? "" : p.email).trim();
  // O primeiro caractere = + - viraria fórmula na planilha (ex.: =IMPORTXML(...)@x.co passaria no formato).
  if (email.length > 254 || !/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: "E-mail inválido." };
  return {
    ok: true,
    value: {
      email: email,
      name: String(p.name == null ? "" : p.name).trim().slice(0, 60),
      level: LEVELS.indexOf(p.level) >= 0 ? p.level : "",
      source: SOURCES.indexOf(p.source) >= 0 ? p.source : "outro",
      ref: String(p.ref == null ? "" : p.ref).replace(/[^A-Za-z0-9-]/g, "").slice(0, 32),
    },
  };
}

function makeCode(name, random) {
  var base = String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 5) || "HI";
  var tail = "";
  for (var i = 0; i < 4; i++) tail += CODE_ALPHABET.charAt(Math.floor(random() * CODE_ALPHABET.length));
  return base + "-" + tail;
}

function uniqueCode(name, rows, random) {
  var taken = {};
  for (var i = 1; i < rows.length; i++) taken[rows[i][COL.referralCode]] = true;
  var code;
  var guard = 0;
  do { code = makeCode(name, random); guard++; } while (taken[code] && guard < 50);
  return code;
}

function findRow(rows, col, value) {
  if (!value) return -1;
  for (var i = 1; i < rows.length; i++) if (rows[i][col] === value) return i;
  return -1;
}

function countReferred(rows, code) {
  var n = 0;
  for (var i = 1; i < rows.length; i++) if (rows[i][COL.referredBy] === code) n++;
  return n;
}

/**
 * deps = { sheet, now: () => Date, random: () => number, mail: (to, subject, body) => void, owner: string }
 * sheet precisa de: getDataRange().getValues(), appendRow(array), getRange(row, col).setValue(v)
 */
function handleLead(payload, deps) {
  var v = validate(payload);
  if (!v.ok) return v;
  var lead = v.value;
  var key = emailKey(lead.email);
  var rows = deps.sheet.getDataRange().getValues();

  // Já está na lista: devolve o mesmo código e não conta de novo.
  var existing = findRow(rows, COL.emailKey, key);
  if (existing >= 0) return { ok: true, referralCode: rows[existing][COL.referralCode], existing: true };

  // Indicação válida: o código existe e não é do próprio e-mail.
  var referrerIdx = findRow(rows, COL.referralCode, lead.ref);
  var validRef = referrerIdx >= 0 && rows[referrerIdx][COL.emailKey] !== key;

  var code = uniqueCode(lead.name, rows, deps.random);
  var row = [];
  row[COL.createdAt] = deps.now().toISOString();
  row[COL.email] = safeCell(lead.email);
  row[COL.emailKey] = key;
  row[COL.name] = safeCell(lead.name);
  row[COL.level] = lead.level;
  row[COL.source] = lead.source;
  row[COL.referralCode] = code;
  row[COL.referredBy] = validRef ? lead.ref : "";
  row[COL.referralCount] = 0;
  row[COL.notifiedAt] = "";
  deps.sheet.appendRow(row);

  if (validRef) {
    rows.push(row); // a nova linha já conta
    var count = countReferred(rows, lead.ref);
    deps.sheet.getRange(referrerIdx + 1, COL.referralCount + 1).setValue(count);
    rows[referrerIdx][COL.referralCount] = count;
    if (count >= THRESHOLD && !rows[referrerIdx][COL.notifiedAt]) notifyOwner(rows, referrerIdx, deps);
  }
  return { ok: true, referralCode: code, existing: false };
}

/** Manda o e-mail de aviso e só marca "notifiedAt" se o envio funcionou (assim dá para tentar de novo). */
function notifyOwner(rows, referrerIdx, deps) {
  var r = rows[referrerIdx];
  var code = r[COL.referralCode];
  var friends = [];
  for (var i = 1; i < rows.length; i++) if (rows[i][COL.referredBy] === code) friends.push(rows[i]);
  var who = r[COL.name] ? r[COL.name] + " <" + r[COL.email] + ">" : r[COL.email];
  var lines = [
    "Alguém chegou a " + THRESHOLD + " indicações na promoção do Hi.",
    "",
    "Quem indicou: " + who,
    "Código: " + code,
    "",
    "Indicados (" + friends.length + "):",
  ];
  friends.forEach(function (f, n) { lines.push("  " + (n + 1) + ". " + f[COL.email] + "  (" + f[COL.createdAt] + ")"); });
  lines.push(
    "",
    "Antes de liberar o semestre grátis, confira se os indicados são pessoas reais e se ativaram a conta.",
    "A contagem é feita no cadastro pela lista, não na ativação dentro do app.",
    "",
    "Este aviso sai uma única vez para essa pessoa."
  );
  try {
    deps.mail(deps.owner, "Hi: " + (r[COL.name] || r[COL.email]) + " chegou a " + THRESHOLD + " indicações", lines.join("\n"));
    var stamp = deps.now().toISOString();
    deps.sheet.getRange(referrerIdx + 1, COL.notifiedAt + 1).setValue(stamp);
    r[COL.notifiedAt] = stamp;
    return true;
  } catch (err) {
    console.error("Falha ao enviar o aviso: " + err);
    return false;
  }
}

/** Reenvia avisos que falharam (rode manualmente no editor, se precisar). */
function retryPendingNotifications_(deps) {
  var rows = deps.sheet.getDataRange().getValues();
  var sent = 0;
  for (var i = 1; i < rows.length; i++) {
    var count = countReferred(rows, rows[i][COL.referralCode]);
    if (count >= THRESHOLD && !rows[i][COL.notifiedAt] && notifyOwner(rows, i, deps)) sent++;
  }
  return sent;
}

/* ===================== Ligação com o Google (Apps Script) ===================== */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ownerEmail_() {
  var fromProps = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  return fromProps || Session.getEffectiveUser().getEmail();
}

function realDeps_() {
  return {
    sheet: getSheet_(),
    now: function () { return new Date(); },
    random: Math.random,
    mail: function (to, subject, body) { MailApp.sendEmail(to, subject, body); },
    owner: ownerEmail_(),
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(25000); // evita duas inscrições simultâneas contarem errado
    locked = true;
    var body = e && e.postData && e.postData.contents;
    return json_(handleLead(JSON.parse(body), realDeps_()));
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "Não foi possível processar agora." });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "hi-lista-de-espera" });
}

/** Rode UMA vez no editor: cria a aba "Leads" e pede as permissões. */
function setup() {
  getSheet_();
  console.log("Pronto. Aba '" + SHEET_NAME + "' criada. Avisos vão para: " + ownerEmail_());
}

/** Rode no editor para confirmar que o e-mail de aviso chega. */
function sendTestEmail() {
  MailApp.sendEmail(ownerEmail_(), "Hi: teste do aviso de indicações", "Se você recebeu isto, o aviso de 3 indicações vai chegar aqui.");
  console.log("Teste enviado para " + ownerEmail_());
}

/** Rode no editor se algum aviso tiver falhado (cota de e-mail, por exemplo). */
function retryPendingNotifications() {
  var n = retryPendingNotifications_(realDeps_());
  console.log("Avisos reenviados: " + n);
}
