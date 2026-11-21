import { describe, expect, it } from "vitest";

import { COURSE_DEFS } from "@/lib/courses";
import { CURRICULUM } from "@/lib/curriculum";

/**
 * Checagens de qualidade do conteúdo (A1–C1). Não substituem a revisão de uma pessoa, mas pegam
 * erro de digitação, campo vazio e opção errada que, na verdade, é uma frase certa.
 */

// Trilha principal (A1–C1) e cursos extras: as mesmas regras valem para os dois.
const units = [
  ...CURRICULUM.sections.flatMap((s) => s.units),
  ...COURSE_DEFS.flatMap((c) => c.units),
];
const allExamples = new Set(units.flatMap((u) => u.items.map((i) => i.example.toLowerCase())));

describe("qualidade do conteúdo da trilha", () => {
  it("nenhum campo de texto vazio e a tradução do exemplo não é cópia do inglês", () => {
    for (const unit of units) {
      for (const item of unit.items) {
        const where = `${unit.code} · ${item.en}`;
        for (const field of [item.en, item.pt, item.example, item.examplePt]) {
          expect(field.trim(), where).not.toBe("");
        }
        expect(item.examplePt, where).not.toBe(item.example);
        if (item.stage === "aplicar") {
          expect(item.ask.en.trim(), where).not.toBe("");
          expect(item.ask.pt.trim(), where).not.toBe("");
          expect(
            item.wrong.every((w) => w.trim() !== ""),
            where,
          ).toBe(true);
        }
      }
    }
  });

  it("não há dois itens com a mesma expressão na mesma etapa da unidade", () => {
    // Entrada e Falar podem repetir a expressão de propósito (o Falar treina um item da Entrada).
    for (const unit of units) {
      const names = unit.items.map((i) => `${i.stage}:${i.en.toLowerCase()}`);
      expect(new Set(names).size, unit.code).toBe(names.length);
    }
  });

  it("espaços e pontuação estão limpos (sem espaço duplo, nas pontas ou antes de pontuação)", () => {
    for (const unit of units) {
      for (const item of unit.items) {
        const texts = [item.en, item.pt, item.example, item.examplePt];
        if (item.stage === "aplicar") texts.push(item.gap, item.ask.en, item.ask.pt, ...item.wrong);
        for (const text of texts) {
          expect(text, `${unit.code} · ${text}`).toBe(text.trim());
          expect(text, `${unit.code} · ${text}`).not.toMatch(/\s{2,}|\s[.,;:!?]/);
        }
      }
    }
  });

  it("uma opção errada nunca recria uma frase certa do currículo", () => {
    for (const unit of units) {
      for (const item of unit.items) {
        if (item.stage !== "aplicar") continue;
        const at = item.example.indexOf(item.gap);
        const before = item.example.slice(0, at);
        const after = item.example.slice(at + item.gap.length);
        for (const wrong of item.wrong) {
          const rebuilt = `${before}${wrong}${after}`.toLowerCase();
          expect(allExamples.has(rebuilt), `${unit.code} · "${rebuilt}"`).toBe(false);
        }
      }
    }
  });

  it("a lacuna não é a frase inteira (sobra contexto pra pessoa se apoiar)", () => {
    for (const unit of units) {
      for (const item of unit.items) {
        if (item.stage !== "aplicar") continue;
        const sentence = item.example.replace(/[.!?]+$/, "");
        expect(item.gap.length, `${unit.code} · ${item.en}`).toBeLessThan(sentence.length);
      }
    }
  });
});
