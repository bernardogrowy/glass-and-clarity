#!/usr/bin/env node
/**
 * Converte a trilha FluentPath (markdown) em JSON e valida a estrutura.
 *
 * Uso: node scripts/adaptar_trilha.mjs "<trilha.md>" --out content/trilha
 *
 * Gera `units.json` e `relatorio.md`. Não altera o markdown original nem o app.
 * Sai com código 1 se houver erros de validação.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--out");
const outIdx = args.indexOf("--out");
const outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : "content/trilha");
if (!input) {
  console.error('Uso: node scripts/adaptar_trilha.mjs "<trilha.md>" --out content/trilha');
  process.exit(2);
}

const lines = readFileSync(resolve(input), "utf8").replace(/\r\n?/g, "\n").split("\n");
const errors = [];
const warnings = [];

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.!?,;:"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "hello (*olá*), good morning (*bom dia*)." → [{en, pt}] */
function parsePairs(text) {
  const out = [];
  const re = /([^()]+?)\s*\(\*(.+?)\*\)/g;
  let m;
  while ((m = re.exec(text.replace(/\.\s*$/, "")))) {
    out.push({ en: m[1].replace(/^[\s,]+/, "").trim(), pt: m[2].trim() });
  }
  return out;
}

const field = (line, label) => {
  const prefix = `**${label}:**`;
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : null;
};

// ---- 1) Divide em blocos por unidade ---------------------------------------------------------
const unitBlocks = [];
let expansionStart = -1;
let cur = null;
lines.forEach((line, i) => {
  const h = line.match(/^## (EN-\d+) — (.+?) \((A1|A2|B1|B2|C1|C2)\)\s*$/);
  if (h) {
    cur = { id: h[1], title: h[2], level: h[3], start: i, lines: [] };
    unitBlocks.push(cur);
    return;
  }
  if (/^## Roteiro de expansão/.test(line)) {
    expansionStart = i;
    cur = null;
    return;
  }
  if (/^## /.test(line)) cur = null;
  if (cur) cur.lines.push({ text: line, n: i + 1 });
});

// ---- 2) Interpreta cada unidade ---------------------------------------------------------------
function parseUnit(b) {
  const where = (n) => `${b.id} (linha ${n})`;
  const unit = {
    id: b.id,
    title: b.title,
    level: b.level,
    objective: "",
    vocabulary: [],
    dialogue: [],
    extra_expressions: [],
    common_mistake: "",
    guided_listening: "",
    modules: [],
    final_test: null,
  };
  let mod = null;
  let finalTest = null;
  let mode = null; // dialogue | module-test | final-test | null

  for (const { text, n } of b.lines) {
    const line = text.trim();
    if (!line) continue;

    let v;
    if ((v = field(line, "Objetivo comunicativo")) !== null) unit.objective = v;
    else if ((v = field(line, "Vocabulário contextualizado")) !== null)
      unit.vocabulary = parsePairs(v);
    else if (line.startsWith("**Diálogo para leitura e áudio:**")) mode = "dialogue";
    else if ((v = field(line, "Expressões extras úteis")) !== null)
      unit.extra_expressions = parsePairs(v);
    else if ((v = field(line, "Erro comum / dica")) !== null) unit.common_mistake = v;
    else if ((v = field(line, "Escuta guiada")) !== null) unit.guided_listening = v;
    else if (/^### Módulo (\d+) — (.+)$/.test(line)) {
      const m = line.match(/^### Módulo (\d+) — (.+)$/);
      mod = {
        number: Number(m[1]),
        title: m[2],
        explanation: "",
        key_expression: { en: "", pt: "" },
        practice_prompt: "",
        test: { interpretation: "", cloze: "", production: "" },
        answer_key: { interpretation: "", cloze: "", production_example: "" },
      };
      unit.modules.push(mod);
      mode = "module";
    } else if (line.startsWith("**Avaliação final da unidade")) {
      finalTest = { cloze: [], writing: "", speaking: "", answer_key: [] };
      unit.final_test = finalTest;
      mod = null;
      mode = "final-test";
    } else if (mode === "dialogue" && line.startsWith(">")) {
      const d = line.match(/^>\s*([AB]):\s*(.+)$/);
      if (d) unit.dialogue.push({ speaker: d[1], text: d[2].trim() });
      else errors.push(`${where(n)}: linha de diálogo fora do formato "A:/B:": ${line}`);
    } else if (mod && (v = field(line, "Expressão-chave")) !== null) {
      const m = v.match(/^\*\*(.+?)\*\*\s+—\s+(.+)$/);
      if (m) mod.key_expression = { en: m[1].trim(), pt: m[2].trim() };
      else errors.push(`${where(n)}: Expressão-chave fora do formato "**EN** — PT".`);
    } else if (mod && (v = field(line, "Aplicação curta")) !== null) mod.practice_prompt = v;
    else if (mod && line.startsWith("**Teste do módulo**")) mode = "module-test";
    else if (mod && mode === "module-test" && /^\d\.\s/.test(line)) {
      const m = line.match(/^(\d)\.\s+(Interpretação|Complete|Produção):\s*(.+)$/);
      if (!m) errors.push(`${where(n)}: item de teste fora do formato: ${line}`);
      else if (m[2] === "Interpretação") mod.test.interpretation = m[3];
      else if (m[2] === "Complete") mod.test.cloze = m[3].replace(/^`|`$/g, "");
      else mod.test.production = m[3];
    } else if (mod && (v = field(line, "Gabarito para o sistema")) !== null) {
      const m = v.match(
        /^1\.\s*(.+?)\s{2,}2\.\s*`([^`]+)`\s{2,}3\.\s*Exemplo de resposta:\s*[“"](.+?)[”"]\./,
      );
      if (!m) errors.push(`${where(n)}: gabarito do módulo ${mod.number} ausente ou malformado.`);
      else
        mod.answer_key = {
          interpretation: m[1].trim(),
          cloze: m[2].trim(),
          production_example: m[3].trim(),
        };
      mode = "module";
    } else if (mode === "module" && mod && !mod.explanation && !line.startsWith("**")) {
      mod.explanation = line;
    } else if (finalTest && /^\d\.\s/.test(line)) {
      const m = line.match(/^(\d)\.\s+(.+)$/);
      const idx = Number(m[1]);
      if (idx <= 3) finalTest.cloze.push(m[2].replace(/^Complete:\s*`?|`$/g, ""));
      else if (idx === 4) finalTest.writing = m[2];
      else if (idx === 5) finalTest.speaking = m[2];
    } else if (finalTest && (v = field(line, "Gabarito das questões 1 a 3")) !== null) {
      const m = v.match(/^(.+?)\.\s+As questões 4 e 5/);
      if (!m) errors.push(`${where(n)}: gabarito do teste final malformado.`);
      else finalTest.answer_key = m[1].split(",").map((s) => s.trim());
    }
  }
  return unit;
}

const units = unitBlocks.map(parseUnit);

// ---- 3) Validação ----------------------------------------------------------------------------
for (const u of units) {
  const at = u.id;
  if (!u.objective) errors.push(`${at}: sem objetivo comunicativo.`);
  if (u.dialogue.length < 3) errors.push(`${at}: diálogo com ${u.dialogue.length} falas (mín. 3).`);
  if (u.vocabulary.length !== 6)
    warnings.push(`${at}: ${u.vocabulary.length} itens de vocabulário (esperado 6).`);
  if (u.extra_expressions.length !== 3)
    warnings.push(`${at}: ${u.extra_expressions.length} expressões extras (esperado 3).`);
  if (u.modules.length !== 3) errors.push(`${at}: ${u.modules.length} módulos (esperado 3).`);

  for (const m of u.modules) {
    const id = `${at} M${m.number}`;
    const { test, answer_key: key, key_expression: expr } = m;
    if (!key.cloze || !key.interpretation || !key.production_example) {
      errors.push(`${id}: gabarito ausente.`);
      continue;
    }
    if (!expr.en || !expr.pt) errors.push(`${id}: expressão-chave ausente.`);
    if (!/_{3,}/.test(test.cloze)) {
      errors.push(`${id}: lacuna "____" ausente no item Complete.`);
      continue;
    }
    if (!norm(expr.en).includes(norm(key.cloze)))
      errors.push(`${id}: resposta "${key.cloze}" não aparece na expressão "${expr.en}".`);
    const rebuilt = test.cloze.replace(/_{3,}/, key.cloze);
    if (norm(rebuilt) !== norm(expr.en))
      errors.push(`${id}: lacuna preenchida ("${rebuilt}") difere da expressão ("${expr.en}").`);
    if (norm(key.interpretation) !== norm(expr.pt))
      warnings.push(`${id}: gabarito de interpretação difere da tradução da expressão-chave.`);
    if (!test.interpretation || !test.production) errors.push(`${id}: teste incompleto.`);
  }

  const ft = u.final_test;
  if (!ft) {
    errors.push(`${at}: sem avaliação final.`);
    continue;
  }
  if (ft.cloze.length !== 3 || ft.answer_key.length !== 3)
    errors.push(`${at}: teste final precisa de 3 lacunas e 3 respostas.`);
  if (!ft.writing || !ft.speaking) errors.push(`${at}: teste final sem questão escrita/oral.`);
  u.modules.forEach((m, i) => {
    if (ft.answer_key[i] && ft.answer_key[i] !== m.answer_key.cloze)
      errors.push(
        `${at}: resposta ${i + 1} do teste final ("${ft.answer_key[i]}") difere do módulo ("${m.answer_key.cloze}").`,
      );
    if (ft.cloze[i] && ft.cloze[i] !== m.test.cloze)
      errors.push(`${at}: lacuna ${i + 1} do teste final difere da do módulo ${m.number}.`);
  });
}

if (units.length !== 24) errors.push(`Esperadas 24 unidades A1–B2; encontradas ${units.length}.`);
const ids = units.map((u) => u.id);
ids.forEach((id, i) => {
  if (id !== `EN-${String(i + 1).padStart(2, "0")}`)
    errors.push(`Sequência de ids quebrada em ${id} (posição ${i + 1}).`);
});

// ---- 4) Roteiro de expansão (C1–C2): apenas esboço -------------------------------------------
const expansion_outline = [];
if (expansionStart >= 0) {
  let level = null;
  for (const line of lines.slice(expansionStart)) {
    if (/^## (?!Roteiro)/.test(line)) break;
    const lv = line.match(/^### (C[12])\s*$/);
    if (lv) level = lv[1];
    const it = line.match(/^- \*\*(EN-\d+) — (.+?):\*\* (.+)$/);
    if (it && level)
      expansion_outline.push({ id: it[1], level, title: it[2], objective: it[3].trim() });
  }
}
if (expansion_outline.length !== 12)
  warnings.push(`Roteiro C1–C2 com ${expansion_outline.length} itens (esperado 12).`);

// ---- 5) Saída --------------------------------------------------------------------------------
const totals = {
  units: units.length,
  modules: units.reduce((s, u) => s + u.modules.length, 0),
  final_tests: units.filter((u) => u.final_test).length,
  by_level: units.reduce((a, u) => ({ ...a, [u.level]: (a[u.level] ?? 0) + 1 }), {}),
};

const human_review = [
  "Revisão por especialistas em inglês: adequação de nível, pronúncia, acessibilidade e viés das avaliações.",
  "Critérios de aprovação (4/5 no módulo, 8/9 e 2/3 na fala no teste final) são sugestões a validar com professores e pilotos.",
  "Respostas de produção livre e fala dependem de rubrica (sentido, relevância, clareza, estrutura-alvo) — aceitar equivalentes corretos.",
  "A voz não deve penalizar sotaques brasileiros compreensíveis; roteiros de diálogo não são arquivos de áudio (TTS/gravação pendente).",
  "Não atribuir nível CEFR só pela quantidade de unidades concluídas.",
];

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "units.json"),
  JSON.stringify(
    { source: "FluentPath — Conteúdo da Trilha de Inglês (v1)", totals, units, expansion_outline },
    null,
    2,
  ) + "\n",
);

const report = [
  "# Relatório de conversão da trilha",
  "",
  `- Unidades: **${totals.units}** (${Object.entries(totals.by_level)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")})`,
  `- Módulos: **${totals.modules}**`,
  `- Testes finais: **${totals.final_tests}**`,
  `- Roteiro C1–C2 (não ativar no app): **${expansion_outline.length}** itens`,
  "",
  `## Erros (${errors.length})`,
  ...(errors.length ? errors.map((e) => `- ${e}`) : ["Nenhum."]),
  "",
  `## Avisos (${warnings.length})`,
  ...(warnings.length ? warnings.map((w) => `- ${w}`) : ["Nenhum."]),
  "",
  "## Pendências de revisão humana",
  ...human_review.map((h) => `- ${h}`),
  "",
].join("\n");
writeFileSync(join(outDir, "relatorio.md"), report);

console.log(report.split("\n").slice(0, 8).join("\n"));
console.log(
  `\nErros: ${errors.length} | Avisos: ${warnings.length} → ${join(outDir, "relatorio.md")}`,
);
process.exit(errors.length ? 1 : 0);
