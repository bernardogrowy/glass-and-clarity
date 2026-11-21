import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVITIES, COURSE_ACTIVITIES, COURSES, UNITS } from "@/lib/trail";

// Meio-dia de um dia qualquer: evita surpresas de virada de dia/horário de verão nos cálculos.
const T0 = new Date(2026, 10, 21, 12).getTime();
const day = (n: number) => new Date(2026, 10, 21 + n, 12).getTime();

async function load() {
  vi.resetModules();
  window.localStorage.clear();
  const review = await import("@/lib/review-store");
  const session = await import("@/lib/review-session");
  return { review, session };
}

describe("agenda de revisão espaçada", () => {
  let r: Awaited<ReturnType<typeof load>>["review"];
  beforeEach(async () => {
    ({ review: r } = await load());
  });

  it("palavra nova entra para amanhã de manhã, não para hoje", () => {
    r.enrollWords(["deadline"], T0);
    const item = r.reviewCloudBinding.get().items.deadline!;
    expect(item).toMatchObject({ box: 0, reviews: 0, lapses: 0 });
    expect(r.getDueWordIds(r.reviewCloudBinding.get(), T0)).toEqual([]);
    // Amanhã cedo já está disponível.
    const tomorrowMorning = new Date(2026, 10, 22, 7).getTime();
    expect(r.getDueWordIds(r.reviewCloudBinding.get(), tomorrowMorning)).toEqual(["deadline"]);
  });

  it("os intervalos crescem 1 → 3 → 7 → 14 → 30 dias a cada acerto", () => {
    r.enrollWords(["deadline"], T0);
    let now = day(1);
    // Cada acerto leva a próxima revisão para o início do dia, N dias à frente; a última caixa repete 30.
    for (const days of [3, 7, 14, 30, 30]) {
      r.answerReview("deadline", true, now);
      const dueAt = r.reviewCloudBinding.get().items.deadline!.dueAt;
      expect(dueAt).toBe(r.dueDay(now, days));
      now = dueAt + 1000;
    }
    expect(r.reviewCloudBinding.get().items.deadline).toMatchObject({ box: 4, reviews: 5 });
    expect(r.getReviewTotals(r.reviewCloudBinding.get())).toEqual({ total: 1, mastered: 1 });
  });

  it("errar volta para a primeira caixa e para amanhã, e conta a recaída", () => {
    r.enrollWords(["deadline"], T0);
    r.answerReview("deadline", true, day(1));
    r.answerReview("deadline", true, day(4));
    r.answerReview("deadline", false, day(11));
    const item = r.reviewCloudBinding.get().items.deadline!;
    expect(item).toMatchObject({ box: 0, lapses: 1, reviews: 3 });
    expect(item.dueAt).toBe(new Date(2026, 10, 21 + 12).getTime());
  });

  it("refazer uma atividade não zera o progresso de uma palavra que já está na agenda", () => {
    r.enrollWords(["deadline"], T0);
    r.answerReview("deadline", true, day(1));
    r.enrollWords(["deadline", "budget"], day(2));
    expect(r.reviewCloudBinding.get().items.deadline!.box).toBe(1);
    expect(r.reviewCloudBinding.get().items.budget!.box).toBe(0);
  });

  it("ignora palavra que não está na agenda e ordena da mais atrasada para a mais recente", () => {
    r.answerReview("fantasma", true, T0);
    expect(r.reviewCloudBinding.get().items.fantasma).toBeUndefined();
    r.enrollWords(["b"], day(3));
    r.enrollWords(["a"], T0);
    expect(r.getDueWordIds(r.reviewCloudBinding.get(), day(10))).toEqual(["a", "b"]);
  });

  it("agenda antiga sem campos continua carregando", async () => {
    window.localStorage.setItem("hi.review.v1", "{}");
    vi.resetModules();
    const again = await import("@/lib/review-store");
    expect(again.reviewCloudBinding.get().items).toEqual({});
  });
});

describe("sessão de revisão entre unidades", () => {
  it("concluir atividades põe as palavras na agenda (entrada, aplicar e falar), uma vez", async () => {
    vi.resetModules();
    window.localStorage.clear();
    const trail = await import("@/lib/trail-store");
    const review = await import("@/lib/review-store");
    const unit = UNITS[0]!;
    const by = (skill: string) => unit.activities.find((a) => a.skill === skill)!;

    trail.recordLessonResult(by("entrada").id, 100);
    const afterEntrada = Object.keys(review.reviewCloudBinding.get().items);
    expect(afterEntrada.sort()).toEqual([...by("entrada").wordIds].sort());

    // Recordar só recicla as mesmas palavras: nada novo na agenda.
    trail.recordLessonResult(by("recordar").id, 100);
    expect(Object.keys(review.reviewCloudBinding.get().items)).toHaveLength(afterEntrada.length);

    trail.recordLessonResult(by("aplicar").id, 100);
    trail.recordLessonResult(by("falar").id, 100);
    const all = Object.keys(review.reviewCloudBinding.get().items);
    for (const skill of ["entrada", "aplicar", "falar"]) {
      for (const id of by(skill).wordIds) expect(all).toContain(id);
    }
  });

  it("checkpoint reprovado não conclui e não agenda nada novo", async () => {
    vi.resetModules();
    window.localStorage.clear();
    const trail = await import("@/lib/trail-store");
    const review = await import("@/lib/review-store");
    const checkpoint = UNITS[0]!.activities.find((a) => a.skill === "checkpoint")!;
    expect(trail.recordLessonResult(checkpoint.id, 10)?.completed).toBe(false);
    expect(review.reviewCloudBinding.get().items).toEqual({});
  });

  it("monta até 10 perguntas válidas, misturando unidades, da palavra mais atrasada em diante", async () => {
    const { review, session } = await load();
    // Três unidades de níveis diferentes, todas já aprendidas há muito tempo.
    const units = [UNITS[0]!, UNITS[5]!, UNITS[12]!];
    units.forEach((unit, i) => {
      const words = unit.activities
        .filter((a) => ["entrada", "aplicar"].includes(a.skill))
        .flatMap((a) => a.wordIds);
      review.enrollWords(words, day(-40 + i));
    });
    const state = review.reviewCloudBinding.get();
    const questions = session.buildReviewSession(state, T0, 7);

    expect(questions).toHaveLength(session.REVIEW_SESSION_SIZE);
    // Intercala: as primeiras 3 perguntas vêm de 3 unidades diferentes.
    expect(new Set(questions.slice(0, 3).map((q) => q.unitId)).size).toBe(3);
    for (const q of questions) {
      expect(q.options[q.correct], q.id).toBeDefined();
      expect(new Set(q.options).size, q.id).toBe(q.options.length);
      expect(q.example, q.id).toBeDefined();
    }
    // Sem palavra repetida.
    expect(new Set(questions.map((q) => q.wordId)).size).toBe(questions.length);
  });

  it("sem nada vencido, a sessão é vazia; palavra que não existe mais no conteúdo é ignorada", async () => {
    const { review, session } = await load();
    expect(session.buildReviewSession(review.reviewCloudBinding.get(), T0, 1)).toEqual([]);
    review.enrollWords(["palavra-que-nao-existe-mais"], day(-30));
    expect(session.getReviewDue(review.reviewCloudBinding.get(), T0)).toEqual([]);
    expect(session.buildReviewSession(review.reviewCloudBinding.get(), T0, 1)).toEqual([]);
  });

  it("palavras de cursos extras também entram", async () => {
    const { review, session } = await load();
    const course = COURSES[0]!;
    const entrada = course.units[0]!.activities.find((a) => a.skill === "entrada")!;
    review.enrollWords(entrada.wordIds, day(-5));
    const questions = session.buildReviewSession(review.reviewCloudBinding.get(), T0, 3);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.unitId === course.units[0]!.id)).toBe(true);
  });

  it("todas as atividades revisáveis têm suas palavras no índice (nenhuma palavra fica de fora)", async () => {
    const { review, session } = await load();
    const ids = [...ACTIVITIES, ...COURSE_ACTIVITIES]
      .filter((a) => session.isReviewableActivity(a))
      .flatMap((a) => a.wordIds);
    review.enrollWords(ids, day(-90));
    const due = session.getReviewDue(review.reviewCloudBinding.get(), T0);
    expect(due).toHaveLength(new Set(ids).size);
  });
});
