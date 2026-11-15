import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRICULUM } from "@/lib/curriculum";
import { ACTIVITIES, CHECKPOINT_PASS_ACCURACY, TRAIL_LESSONS, UNITS } from "@/lib/trail";
import { getLesson } from "@/lib/lessons";
import { routeTree } from "@/routeTree.gen";

describe("estrutura da trilha", () => {
  it("cada unidade vira 5 atividades em ordem, terminando no checkpoint", () => {
    const authored = CURRICULUM.sections.flatMap((s) => s.units);
    expect(UNITS).toHaveLength(authored.length);
    for (const unit of UNITS) {
      expect(unit.activities.map((a) => a.skill)).toEqual([
        "descobrir",
        "reconhecer",
        "recordar",
        "aplicar",
        "checkpoint",
      ]);
    }
  });

  it("ids de atividade e de unidade são únicos e cada atividade tem uma lição jogável", () => {
    expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length);
    for (const activity of ACTIVITIES) {
      const lesson = getLesson(activity.lessonId);
      expect(lesson, activity.id).toBeDefined();
      expect(lesson?.steps.length).toBeGreaterThan(0);
    }
  });

  it("a lacuna do diálogo e as peças da frase batem com o exemplo da palavra", () => {
    for (const lesson of TRAIL_LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind === "dialogo") {
          const word = lesson.words.find((w) => w.id === step.wordId)!;
          const rebuilt = `${step.before} ${step.correct} ${step.after}`
            .replace(/\s+([.,;:!?])/g, "$1")
            .trim();
          expect(rebuilt, lesson.id).toBe(word.example);
          expect(new Set(step.options).size).toBe(step.options.length);
          // A fala da Hi não entrega a resposta.
          expect(step.hi.toLowerCase()).not.toContain(step.correct.toLowerCase());
        }
        if (step.kind === "ordenar") {
          const word = lesson.words.find((w) => w.id === step.wordId)!;
          expect(step.answer + ".").toBe(word.example);
          // Não nasce já na ordem certa.
          expect(step.tiles.join(" ")).not.toBe(step.answer);
        }
        if (step.kind === "escolha") {
          const pts = step.options.map((o) => o.pt);
          expect(new Set(pts).size).toBe(pts.length);
        }
      }
    }
  });

  it("existe a rota /trilha", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/trilha").at(-1)?.routeId).toBe("/trilha");
  });
});

describe("progresso da trilha", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  /** Joga uma lição inteira acertando (ou errando) tudo e fecha o resumo. */
  async function play(lessonId: string, correct: boolean) {
    const lessons = await import("@/lib/lesson-store");
    const lesson = getLesson(lessonId)!;
    lessons.startLesson(lessonId);
    lesson.steps.forEach((step, index) => {
      if (step.kind === "descobrir") return;
      const wordIds = step.kind === "pares" ? step.wordIds : [step.wordId];
      lessons.recordStep(index, {
        correct,
        wordIds,
        missedWordIds: correct ? [] : wordIds,
        reachedStage: 2,
      });
    });
    return lessons.finishLesson();
  }

  it("começa zerado, com a 1ª atividade como atual e o resto bloqueado", async () => {
    const store = await import("@/lib/trail-store");
    const state = store.trailCloudBinding.get();
    expect(state.completed).toEqual({});
    expect(store.getCurrent(state)?.activity.id).toBe(ACTIVITIES[0]!.id);
    expect(store.getActivityStatus(state, ACTIVITIES[0]!)).toBe("atual");
    expect(store.getActivityStatus(state, ACTIVITIES[1]!)).toBe("bloqueada");
    expect(store.getUnitStatus(state, UNITS[1]!)).toBe("bloqueada");
  });

  it("terminar a lição conclui a atividade, libera a próxima e persiste", async () => {
    const first = ACTIVITIES[0]!;
    await play(first.lessonId, true);

    const store = await import("@/lib/trail-store");
    const state = store.trailCloudBinding.get();
    expect(store.isActivityDone(state, first.id)).toBe(true);
    expect(store.getActivityStatus(state, ACTIVITIES[1]!)).toBe("atual");
    expect(store.getCurrent(state)?.activity.id).toBe(ACTIVITIES[1]!.id);

    const saved = JSON.parse(window.localStorage.getItem("hi.trail.v1") ?? "{}");
    expect(saved.completed[first.id].accuracy).toBe(100);
  });

  it("o atalho da Home aponta pra mesma atividade e avança junto", async () => {
    const store = await import("@/lib/trail-store");
    const before = store.getCurrent(store.trailCloudBinding.get())!;
    await play(before.activity.lessonId, true);
    const after = store.getCurrent(store.trailCloudBinding.get())!;
    expect(after.activity.id).not.toBe(before.activity.id);
  });

  it("lição fora da trilha não mexe no progresso da trilha", async () => {
    await play("entrevista", true);
    const store = await import("@/lib/trail-store");
    expect(store.trailCloudBinding.get().completed).toEqual({});
  });

  it("checkpoint reprovado não abre a próxima unidade; refazer e passar abre", async () => {
    const store = await import("@/lib/trail-store");
    const unit = UNITS[0]!;
    const checkpoint = unit.activities.at(-1)!;

    // Conclui as 4 primeiras atividades.
    for (const activity of unit.activities.slice(0, -1)) await play(activity.lessonId, true);
    expect(store.getUnitStatus(store.trailCloudBinding.get(), unit)).toBe("atual");

    const failed = await play(checkpoint.lessonId, false);
    expect(failed!.accuracy).toBeLessThan(CHECKPOINT_PASS_ACCURACY);
    let state = store.trailCloudBinding.get();
    expect(store.isActivityDone(state, checkpoint.id)).toBe(false);
    expect(store.getUnitStatus(state, UNITS[1]!)).toBe("bloqueada");

    await play(checkpoint.lessonId, true);
    state = store.trailCloudBinding.get();
    expect(store.isActivityDone(state, checkpoint.id)).toBe(true);
    expect(store.isUnitDone(state, unit)).toBe(true);
    expect(store.getUnitStatus(state, UNITS[1]!)).toBe("atual");
  });

  it("refazer uma atividade concluída nunca a desconclui nem baixa o melhor acerto", async () => {
    const first = ACTIVITIES[0]!;
    await play(first.lessonId, true);
    await play(first.lessonId, false);
    const store = await import("@/lib/trail-store");
    const record = store.trailCloudBinding.get().completed[first.id]!;
    expect(record.accuracy).toBe(100);
    expect(record.runs).toBe(2);
  });

  it("entra na sincronização com a nuvem", async () => {
    const { CLOUD_BINDINGS } = await import("@/lib/cloud-bindings");
    expect(CLOUD_BINDINGS.map((b) => b.field)).toContain("trail");
  });

  it("conta nova (estado vazio da nuvem) descarta sobra local", async () => {
    const store = await import("@/lib/trail-store");
    await play(ACTIVITIES[0]!.lessonId, true);
    store.trailCloudBinding.replace(store.trailCloudBinding.empty());
    expect(store.trailCloudBinding.get().completed).toEqual({});
  });
});
