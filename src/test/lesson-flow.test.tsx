import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { LESSONS } from "@/lib/lessons";

describe("Lição de vocabulário", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("tem rotas pra cada etapa", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of ["descobrir", "escolha", "pares", "ordenar", "dialogo", "resumo", ""]) {
      const matches = router.matchRoutes(`/licao/entrevista/${path}`);
      expect(matches.at(-1)?.routeId).not.toBe("__root__");
    }
  });

  it("todo passo aponta pra uma palavra que existe e a resposta está nas opções", () => {
    for (const lesson of LESSONS) {
      const ids = new Set(lesson.words.map((w) => w.id));
      for (const step of lesson.steps) {
        if (step.kind === "pares") {
          expect(step.wordIds.every((id) => ids.has(id))).toBe(true);
          expect([...step.rightOrder].sort()).toEqual([...step.wordIds].sort());
          continue;
        }
        expect(ids.has(step.wordId)).toBe(true);
        if (step.kind === "escolha") expect(step.options[step.correct]).toBeDefined();
        if (step.kind === "dialogo") expect(step.options).toContain(step.correct);
        if (step.kind === "ordenar") {
          expect([...step.tiles].sort()).toEqual(
            expect.arrayContaining([...step.answer.split(" ")].sort()),
          );
        }
      }
    }
  });

  it("conta acerto na 1ª tentativa uma vez por etapa e fecha o resumo uma vez", async () => {
    const store = await import("@/lib/lesson-store");
    store.startLesson("entrevista");

    store.recordStep(2, {
      correct: true,
      wordIds: ["deadline"],
      missedWordIds: [],
      reachedStage: 2,
    });
    store.recordStep(2, {
      correct: false,
      wordIds: ["deadline"],
      missedWordIds: ["deadline"],
      reachedStage: 2,
    });
    store.recordStep(4, {
      correct: false,
      wordIds: ["position"],
      missedWordIds: ["position"],
      reachedStage: 2,
    });

    const first = store.finishLesson();
    const second = store.finishLesson();

    expect(first?.accuracy).toBe(50);
    expect(first?.missedWordIds).toEqual(["position"]);
    expect(first?.streakGained).toBe(true);
    expect(second).toBe(first);
  });

  it("palavra errada não sobe de etapa; certa sobe e nunca desce", async () => {
    const store = await import("@/lib/lesson-store");
    store.startLesson("entrevista");
    store.recordStep(5, {
      correct: true,
      wordIds: ["available"],
      missedWordIds: [],
      reachedStage: 3,
    });
    store.recordStep(6, {
      correct: false,
      wordIds: ["position"],
      missedWordIds: ["position"],
      reachedStage: 3,
    });
    store.recordStep(2, {
      correct: true,
      wordIds: ["available"],
      missedWordIds: [],
      reachedStage: 2,
    });

    const raw = JSON.parse(window.localStorage.getItem("hi.lessons.v1") ?? "{}");
    expect(raw.wordStages.available).toBe(3);
    expect(raw.wordStages.position).toBeUndefined();
  });
});
