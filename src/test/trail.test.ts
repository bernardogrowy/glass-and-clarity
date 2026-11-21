import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRICULUM } from "@/lib/curriculum";
import {
  ACTIVITIES,
  CHECKPOINT_PASS_ACCURACY,
  COURSES,
  COURSE_ACTIVITIES,
  EXTRA_COURSES_UNLOCK_ACTIVITIES,
  getActivity,
  getCourseOfActivity,
  SECTIONS,
  TRAIL_LESSONS,
  UNITS,
  getNextLevelWithContent,
  getTrackActivities,
  getTrackLevel,
  getVisibleSections,
  isReviewSection,
} from "@/lib/trail";
import { getLesson } from "@/lib/lessons";
import { routeTree } from "@/routeTree.gen";

describe("estrutura da trilha", () => {
  it("cada unidade vira 5 atividades em ordem, terminando no checkpoint", () => {
    const authored = CURRICULUM.sections.flatMap((s) => s.units);
    expect(UNITS).toHaveLength(authored.length);
    for (const unit of UNITS) {
      expect(unit.activities.map((a) => a.skill)).toEqual([
        "entrada",
        "recordar",
        "aplicar",
        "falar",
        "checkpoint",
      ]);
    }
  });

  it("o A1 tem 4 unidades de 25 itens (14 Entrada, 6 Aplicar, 5 Falar) e mantém os ids antigos", () => {
    const a1 = CURRICULUM.sections.find((s) => s.level === "A1")!;
    expect(a1.units.map((u) => u.code)).toEqual(["A1.1", "A1.2", "A1.3", "A1.4"]);
    expect(a1.units.slice(0, 3).map((u) => u.id)).toEqual([
      "apresentar-se",
      "apresentacoes-profissionais",
      "entrevista-simples",
    ]);
    for (const unit of a1.units) {
      const count = (stage: string) => unit.items.filter((i) => i.stage === stage).length;
      expect(unit.items, unit.id).toHaveLength(25);
      expect([count("entrada"), count("aplicar"), count("falar")], unit.id).toEqual([14, 6, 5]);
    }
  });

  it("A1 a C1 têm 4 unidades por nível, com 25 a 30 itens e as 3 etapas de conteúdo", () => {
    const levels = CURRICULUM.sections.map((s) => s.level);
    expect(levels).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    for (const section of CURRICULUM.sections) {
      expect(
        section.units.map((u) => u.code),
        section.level,
      ).toEqual([1, 2, 3, 4].map((n) => `${section.level}.${n}`));
      for (const unit of section.units) {
        const count = (stage: string) => unit.items.filter((i) => i.stage === stage).length;
        expect(unit.items.length, unit.code).toBeGreaterThanOrEqual(25);
        expect(unit.items.length, unit.code).toBeLessThanOrEqual(30);
        expect(count("entrada"), unit.code).toBeGreaterThanOrEqual(8);
        expect(count("aplicar"), unit.code).toBeGreaterThanOrEqual(3);
        expect(count("falar"), unit.code).toBeGreaterThanOrEqual(3);
      }
    }
    // 20 unidades no total, como no planejamento.
    expect(UNITS).toHaveLength(20);
  });

  it("itens de Aplicar têm lacuna no exemplo, e Hi e opções erradas não entregam a lacuna", () => {
    for (const unit of CURRICULUM.sections.flatMap((s) => s.units)) {
      for (const item of unit.items) {
        if (item.stage !== "aplicar") continue;
        const gap = item.gap.toLowerCase();
        expect(item.example, item.en).toContain(item.gap);
        expect(item.ask.en.toLowerCase(), item.en).not.toContain(gap);
        expect(
          item.wrong.map((w) => w.toLowerCase()),
          item.en,
        ).not.toContain(gap);
        expect(new Set(item.wrong).size).toBe(2);
      }
    }
  });

  it("cada etapa tem os passos certos e o checkpoint não traz item novo", () => {
    for (const unit of UNITS) {
      const kinds = (skill: string) =>
        new Set(getLesson(`${unit.id}-${skill}`)!.steps.map((s) => s.kind));
      expect(kinds("entrada")).toEqual(new Set(["descobrir", "pares"]));
      expect(kinds("recordar")).toEqual(new Set(["ordenar"]));
      expect(kinds("aplicar")).toEqual(new Set(["dialogo"]));
      expect(kinds("falar")).toEqual(new Set(["falar"]));
      expect(kinds("checkpoint")).toEqual(new Set(["ordenar", "dialogo", "falar"]));

      // Mesmos itens: tudo o que o checkpoint pede já apareceu antes na unidade.
      const seen = new Set(
        ["entrada", "aplicar", "falar"].flatMap((skill) =>
          getLesson(`${unit.id}-${skill}`)!.words.map((w) => w.id),
        ),
      );
      for (const step of getLesson(`${unit.id}-checkpoint`)!.steps) {
        if (step.kind !== "pares") expect(seen.has(step.wordId)).toBe(true);
      }
    }
  });

  it("ids de palavra são únicos em toda a trilha", () => {
    const ids = UNITS.flatMap((u) => getLesson(`${u.id}-checkpoint`)!.words.map((w) => w.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("o checkpoint pede 70%", () => {
    expect(CHECKPOINT_PASS_ACCURACY).toBe(70);
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
          expect(step.answer).toBe(word.example.replace(/[.!?]+$/, ""));
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

  it("a frase do Falar é o exemplo do item", () => {
    for (const lesson of TRAIL_LESSONS) {
      for (const step of lesson.steps) {
        if (step.kind !== "falar") continue;
        const word = lesson.words.find((w) => w.id === step.wordId)!;
        expect(step.target).toBe(word.example);
        expect(step.targetPt).toBe(word.examplePt);
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

describe("nível do perfil na trilha", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("segue o maior nível com conteúdo que não passa do nível da pessoa", () => {
    expect(getTrackLevel("A1")).toBe("A1");
    expect(getTrackLevel("A2")).toBe("A2");
    expect(getTrackLevel("B1")).toBe("B1");
    expect(getTrackLevel("B2")).toBe("B2");
    expect(getTrackLevel("C1")).toBe("C1");
    expect(getTrackLevel("C2")).toBe("C1");
  });

  it("mostra as seções do nível da pessoa e as anteriores, nunca as de nível acima", () => {
    expect(getVisibleSections("A1").map((s) => s.level)).toEqual(["A1"]);
    expect(getVisibleSections("A2").map((s) => s.level)).toEqual(["A1", "A2"]);
    expect(getVisibleSections("B1").map((s) => s.level)).toEqual(["A1", "A2", "B1"]);
    expect(getVisibleSections("C2")).toHaveLength(SECTIONS.length);
  });

  it("seções de nível abaixo do que a pessoa segue são de revisão e saem da trilha em ordem", () => {
    const a1 = SECTIONS.find((s) => s.level === "A1")!;
    expect(isReviewSection(a1, "A1")).toBe(false);
    expect(isReviewSection(a1, "B1")).toBe(true);
    const b1Units = SECTIONS.find((s) => s.level === "B1")!.units.map((u) => u.id);
    expect([...new Set(getTrackActivities("B1").map((a) => a.unitId))]).toEqual(b1Units);
  });

  it("sem o nível, a liberação é a linear de sempre", async () => {
    const store = await import("@/lib/trail-store");
    const state = store.trailCloudBinding.get();
    expect(store.getCurrent(state)?.activity.id).toBe(ACTIVITIES[0]!.id);
    expect(store.getActivityStatus(state, ACTIVITIES[1]!)).toBe("bloqueada");
    expect(store.getUnitStatus(state, UNITS[1]!)).toBe("bloqueada");
  });

  it("com o nível, a trilha começa no nível dela e as seções abaixo ficam abertas pra revisão", async () => {
    const store = await import("@/lib/trail-store");
    const state = store.trailCloudBinding.get();
    const b1 = SECTIONS.find((s) => s.level === "B1")!;

    expect(store.getCurrent(state, "B1")?.activity.id).toBe(b1.units[0]!.activities[0]!.id);
    // A1 e A2 abertos (revisão), mesmo sem nada concluído.
    expect(store.getUnitStatus(state, UNITS[0]!, "B1")).toBe("atual");
    expect(store.getActivityStatus(state, ACTIVITIES[1]!, "B1")).toBe("atual");
    // No B1 a liberação continua linear.
    expect(store.getActivityStatus(state, b1.units[0]!.activities[1]!, "B1")).toBe("bloqueada");
    expect(store.getUnitStatus(state, b1.units[1]!, "B1")).toBe("bloqueada");
  });

  it("a vizinhança de unidades respeita o que a pessoa vê", async () => {
    const store = await import("@/lib/trail-store");
    const a1 = SECTIONS.find((s) => s.level === "A1")!;
    const lastA1 = a1.units.at(-1)!;
    expect(store.getAdjacentUnit(lastA1, 1)?.code).toBe("A2.1");
    // Quem é A1 não enxerga o A2.
    expect(store.getAdjacentUnit(lastA1, 1, "A1")).toBeUndefined();
    expect(store.getAdjacentUnit(lastA1, 1, "A2")?.code).toBe("A2.1");
  });

  it("indica o próximo nível com conteúdo", () => {
    expect(getNextLevelWithContent("A1")).toBe("A2");
    expect(getNextLevelWithContent("B2")).toBe("C1");
    expect(getNextLevelWithContent("C1")).toBeNull();
    expect(getNextLevelWithContent("C2")).toBeNull();
  });
});

describe("cursos extras", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  /** Os cursos só aceitam progresso depois das atividades mínimas da trilha principal. */
  async function unlockCourses() {
    const store = await import("@/lib/trail-store");
    for (const activity of ACTIVITIES.slice(0, EXTRA_COURSES_UNLOCK_ACTIVITIES)) {
      store.recordLessonResult(activity.id, 100);
    }
  }

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

  it("são 7 cursos, todos lançados, com os códigos do planejamento", () => {
    expect(COURSES).toHaveLength(7);
    const codes = Object.fromEntries(COURSES.map((c) => [c.id, c.units.map((u) => u.code)]));
    expect(codes).toEqual({
      "vida-cotidiana": ["VC.1", "VC.2", "VC.3", "VC.4", "VC.5"],
      social: ["SO.1", "SO.2", "SO.3", "SO.4", "SO.5"],
      viagem: ["VT.1", "VT.2", "VT.3", "VT.4", "VT.5"],
      tecnologia: ["TD.1", "TD.2", "TD.3", "TD.4", "TD.5"],
      financas: ["FP.1", "FP.2", "FP.3", "FP.4"],
      saude: ["SE.1", "SE.2", "SE.3", "SE.4"],
      academico: ["AC.1", "AC.2", "AC.3", "AC.4"],
    });
    // 32 unidades de curso extra no total (5+5+5+5+4+4+4).
    expect(COURSES.flatMap((c) => c.units)).toHaveLength(32);
  });

  it("cada unidade de curso tem 25–30 itens e as mesmas 5 atividades da trilha", () => {
    for (const course of COURSES) {
      for (const unit of course.units) {
        expect(
          unit.activities.map((a) => a.skill),
          unit.code,
        ).toEqual(["entrada", "recordar", "aplicar", "falar", "checkpoint"]);
        const words = getLesson(`${unit.id}-checkpoint`)!.words;
        expect(words.length, unit.code).toBeGreaterThanOrEqual(25);
        expect(words.length, unit.code).toBeLessThanOrEqual(30);
      }
    }
  });

  it("ids de unidade, de atividade e de palavra são únicos em toda a plataforma", () => {
    const unitIds = [...UNITS, ...COURSES.flatMap((c) => c.units)].map((u) => u.id);
    expect(new Set(unitIds).size).toBe(unitIds.length);
    const activityIds = [...ACTIVITIES, ...COURSE_ACTIVITIES].map((a) => a.id);
    expect(new Set(activityIds).size).toBe(activityIds.length);
    const wordIds = [...UNITS, ...COURSES.flatMap((c) => c.units)].flatMap((u) =>
      getLesson(`${u.id}-checkpoint`)!.words.map((w) => w.id),
    );
    expect(new Set(wordIds).size).toBe(wordIds.length);
  });

  it("a trilha principal não muda por causa dos cursos", () => {
    expect(UNITS).toHaveLength(20);
    expect(ACTIVITIES).toHaveLength(100);
    expect(ACTIVITIES.some((a) => COURSE_ACTIVITIES.includes(a))).toBe(false);
  });

  it("acha a atividade e o curso, e todas as lições de curso são jogáveis", () => {
    for (const activity of COURSE_ACTIVITIES) {
      expect(getActivity(activity.id)).toBe(activity);
      expect(getCourseOfActivity(activity)).toBeDefined();
      expect(getLesson(activity.lessonId)?.steps.length).toBeGreaterThan(0);
    }
    expect(getCourseOfActivity(ACTIVITIES[0]!)).toBeUndefined();
  });

  it("cada curso libera em ordem própria, sem mexer na trilha principal", async () => {
    const store = await import("@/lib/trail-store");
    const course = COURSES.find((c) => c.id === "vida-cotidiana")!;
    const first = course.units[0]!.activities[0]!;
    const second = course.units[0]!.activities[1]!;
    const other = COURSES.find((c) => c.id === "social")!.units[0]!.activities[0]!;
    await unlockCourses();

    let state = store.trailCloudBinding.get();
    expect(store.getCourseActivityStatus(state, course, first)).toBe("atual");
    expect(store.getCourseActivityStatus(state, course, second)).toBe("bloqueada");
    // O outro curso começa do zero, independente.
    expect(
      store.getCourseActivityStatus(
        state,
        COURSES.find((c) => c.id === "social")!,
        other,
      ),
    ).toBe("atual");

    await play(first.lessonId, true);
    state = store.trailCloudBinding.get();
    expect(store.getCourseActivityStatus(state, course, first)).toBe("concluida");
    expect(store.getCourseActivityStatus(state, course, second)).toBe("atual");
    expect(store.getCourseCurrent(state, course)?.activity.id).toBe(second.id);
    expect(store.getCourseProgress(state, course)).toEqual({ done: 1, total: 25, pct: 4 });

    // A trilha principal segue intocada.
    expect(store.getCurrent(state)?.activity.id).toBe(
      ACTIVITIES[EXTRA_COURSES_UNLOCK_ACTIVITIES]!.id,
    );
    expect(store.getTotalDone(state)).toBe(EXTRA_COURSES_UNLOCK_ACTIVITIES);
  });

  it("o checkpoint do curso também pede 70% e a vizinhança de unidades fica dentro do curso", async () => {
    const store = await import("@/lib/trail-store");
    const course = COURSES.find((c) => c.id === "social")!;
    const unit = course.units[0]!;
    await unlockCourses();
    for (const activity of unit.activities.slice(0, -1)) await play(activity.lessonId, true);

    const checkpoint = unit.activities.at(-1)!;
    const failed = await play(checkpoint.lessonId, false);
    expect(failed!.accuracy).toBeLessThan(CHECKPOINT_PASS_ACCURACY);
    expect(store.isUnitDone(store.trailCloudBinding.get(), unit)).toBe(false);
    await play(checkpoint.lessonId, true);
    expect(store.isUnitDone(store.trailCloudBinding.get(), unit)).toBe(true);

    expect(store.getAdjacentUnit(unit, 1)?.id).toBe(course.units[1]!.id);
    expect(store.getAdjacentUnit(unit, -1)).toBeUndefined();
    expect(store.getAdjacentUnit(course.units.at(-1)!, 1)).toBeUndefined();
  });
});

describe("liberação dos cursos extras", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("começa bloqueado: faltam todas as atividades", async () => {
    const store = await import("@/lib/trail-store");
    const unlock = store.getCoursesUnlock(store.trailCloudBinding.get());
    expect(unlock).toEqual({
      unlocked: false,
      done: 0,
      needed: EXTRA_COURSES_UNLOCK_ACTIVITIES,
      remaining: 5,
    });
  });

  it("libera ao concluir as primeiras 5 atividades da trilha principal", async () => {
    const store = await import("@/lib/trail-store");
    for (const [i, activity] of ACTIVITIES.slice(0, 5).entries()) {
      store.recordLessonResult(activity.id, 100);
      const unlock = store.getCoursesUnlock(store.trailCloudBinding.get());
      expect(unlock.done).toBe(i + 1);
      expect(unlock.unlocked).toBe(i === 4);
      expect(unlock.remaining).toBe(4 - i);
    }
  });

  it("atividades dos próprios cursos não contam pra liberar", async () => {
    const store = await import("@/lib/trail-store");
    for (const activity of COURSE_ACTIVITIES.slice(0, 8)) {
      // Bloqueado: o resultado nem é registrado.
      expect(store.recordLessonResult(activity.id, 100)).toBeNull();
    }
    expect(store.getCoursesUnlock(store.trailCloudBinding.get())).toMatchObject({
      unlocked: false,
      done: 0,
    });
  });

  it("passar de 5 não estoura o contador", async () => {
    const store = await import("@/lib/trail-store");
    for (const activity of ACTIVITIES.slice(0, 8)) store.recordLessonResult(activity.id, 100);
    const unlock = store.getCoursesUnlock(store.trailCloudBinding.get());
    expect(unlock).toMatchObject({ unlocked: true, done: 5, remaining: 0 });
  });
});
