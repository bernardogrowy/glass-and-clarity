import { describe, expect, it } from "vitest";

import {
  MAX_PLACEMENT_QUESTIONS,
  PLACEMENT_BANK,
  PLACEMENT_LEVELS,
  QUESTIONS_PER_LEVEL,
  answerPlacement,
  clampToPlacement,
  currentQuestion,
  placementAnswered,
  placementRank,
  startPlacement,
  type PlacementLevel,
  type PlacementState,
} from "@/lib/placement-test";

/** Joga o teste inteiro: `knows(question)` diz se a pessoa acerta aquela pergunta. */
function run(
  start: PlacementLevel,
  knows: (level: PlacementLevel) => boolean,
  seed = 0,
): { state: PlacementState; asked: PlacementLevel[] } {
  let state = startPlacement(start, seed);
  const asked: PlacementLevel[] = [];
  while (!state.placed) {
    const question = currentQuestion(state)!;
    asked.push(question.level);
    state = answerPlacement(state, knows(question.level));
    expect(asked.length).toBeLessThanOrEqual(MAX_PLACEMENT_QUESTIONS);
  }
  return { state, asked };
}

describe("banco de perguntas", () => {
  it("tem pelo menos 4 perguntas por nível, ids únicos e 4 opções diferentes", () => {
    expect(new Set(PLACEMENT_BANK.map((q) => q.id)).size).toBe(PLACEMENT_BANK.length);
    for (const level of PLACEMENT_LEVELS) {
      expect(PLACEMENT_BANK.filter((q) => q.level === level).length, level).toBeGreaterThanOrEqual(
        4,
      );
    }
    for (const q of PLACEMENT_BANK) {
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.options[q.correct], q.id).toBeDefined();
      expect(q.prompt.trim(), q.id).not.toBe("");
    }
  });

  it("a resposta certa não fica sempre na mesma posição", () => {
    for (const level of PLACEMENT_LEVELS) {
      const positions = PLACEMENT_BANK.filter((q) => q.level === level).map((q) => q.correct);
      expect(new Set(positions).size, level).toBeGreaterThan(1);
    }
  });

  it("perguntas de completar têm uma lacuna", () => {
    for (const q of PLACEMENT_BANK) {
      if (q.instruction.startsWith("Escolha a opção que completa")) {
        expect(q.prompt, q.id).toContain("___");
      }
    }
  });
});

describe("teste adaptativo", () => {
  it("quem sabe tudo até o nível X termina em X, de qualquer ponto de partida", () => {
    for (const start of PLACEMENT_LEVELS) {
      for (const real of PLACEMENT_LEVELS) {
        const { state, asked } = run(start, (level) => placementRank(level) <= placementRank(real));
        expect(state.placed, `começa ${start}, sabe até ${real}`).toBe(real);
        expect(asked.length).toBeLessThanOrEqual(MAX_PLACEMENT_QUESTIONS);
      }
    }
  });

  it("começa no nível escolhido e faz 2 perguntas por nível", () => {
    const state = startPlacement("B1");
    expect(currentQuestion(state)?.level).toBe("B1");
    const { asked } = run("B1", () => true);
    expect(asked.slice(0, QUESTIONS_PER_LEVEL)).toEqual(["B1", "B1"]);
  });

  it("'não sei' em tudo termina no A1", () => {
    for (const start of PLACEMENT_LEVELS) {
      expect(run(start, () => false).state.placed, start).toBe("A1");
    }
  });

  it("1 acerto em 2 termina nesse nível, sem subir nem descer", () => {
    let state = startPlacement("B2");
    state = answerPlacement(state, true);
    state = answerPlacement(state, false);
    expect(state.placed).toBe("B2");
  });

  it("não repete a mesma pergunta num nível e para de perguntar quando termina", () => {
    let state = startPlacement("A2");
    const first = currentQuestion(state)!;
    state = answerPlacement(state, true);
    expect(currentQuestion(state)!.id).not.toBe(first.id);
    state = answerPlacement(state, false);
    expect(state.placed).toBe("A2");
    expect(currentQuestion(state)).toBeNull();
    // Depois de terminar, responder de novo não muda nada.
    expect(answerPlacement(state, true)).toBe(state);
  });

  it("no máximo 10 perguntas, também no pior caso (sobe e desce)", () => {
    // Acerta só nos níveis pares da fila: A1, B1, C1.
    const { asked } = run("A1", (level) => placementRank(level) % 2 === 0);
    expect(asked.length).toBeLessThanOrEqual(MAX_PLACEMENT_QUESTIONS);
  });

  it("quem diz C2 começa no C1 (o teste vai até o C1)", () => {
    expect(clampToPlacement("C2")).toBe("C1");
    expect(startPlacement("C2").current).toBe("C1");
  });

  it("outro seed muda quais perguntas aparecem, sem mudar o nível", () => {
    const a = currentQuestion(startPlacement("B1", 0))!;
    const b = currentQuestion(startPlacement("B1", 1))!;
    expect(a.level).toBe(b.level);
    expect(a.id).not.toBe(b.id);
    expect(run("B1", (l) => placementRank(l) <= 2, 1).state.placed).toBe("B1");
  });

  it("conta as respostas dadas", () => {
    let state = startPlacement("A1");
    expect(placementAnswered(state)).toBe(0);
    state = answerPlacement(state, true);
    state = answerPlacement(state, true);
    expect(placementAnswered(state)).toBe(2);
  });
});
