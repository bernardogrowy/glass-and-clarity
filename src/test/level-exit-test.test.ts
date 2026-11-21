import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXIT_TEST_PASS_ACCURACY,
  EXIT_TEST_QUESTIONS,
  buildLevelExitTest,
  dayKey,
  daySeed,
  getLevelUnits,
  scoreLevelExitTest,
} from "@/lib/level-exit-test";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const DAY = new Date(2026, 10, 21, 10).getTime();

describe("prova de saída do nível", () => {
  it.each(LEVELS)("%s: tem 10 perguntas espalhadas por todas as unidades do nível", (level) => {
    const questions = buildLevelExitTest(level, daySeed(DAY));
    expect(questions).toHaveLength(EXIT_TEST_QUESTIONS);
    const units = getLevelUnits(level);
    expect(units.length).toBeGreaterThan(0);
    expect(new Set(questions.map((q) => q.unitId))).toEqual(new Set(units.map((u) => u.id)));
    // Só perguntas do próprio nível.
    for (const q of questions) expect(units.map((u) => u.id)).toContain(q.unitId);
  });

  it.each(LEVELS)(
    "%s: cada pergunta é válida (opção certa existe, sem opção repetida)",
    (level) => {
      for (const q of buildLevelExitTest(level, daySeed(DAY))) {
        expect(q.correct, q.id).toBeGreaterThanOrEqual(0);
        expect(q.options[q.correct], q.id).toBeDefined();
        expect(new Set(q.options).size, q.id).toBe(q.options.length);
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
        expect(q.prompt.trim(), q.id).not.toBe("");
        if (q.kind === "dialogo") expect(q.sentence, q.id).toBeDefined();
      }
    },
  );

  it("não repete a mesma palavra em duas perguntas", () => {
    for (const level of LEVELS) {
      const ids = buildLevelExitTest(level, daySeed(DAY)).map((q) => q.id.split(":")[2]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("o mesmo dia dá a mesma prova e outro dia dá outra", () => {
    const a = buildLevelExitTest("B1", daySeed(DAY));
    const b = buildLevelExitTest("B1", daySeed(DAY));
    const other = buildLevelExitTest("B1", daySeed(DAY + 3 * 86_400_000));
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(other.map((q) => q.id)).not.toEqual(a.map((q) => q.id));
  });

  it("mistura perguntas de conversa e de significado", () => {
    const kinds = new Set(buildLevelExitTest("A2", daySeed(DAY)).map((q) => q.kind));
    expect(kinds).toEqual(new Set(["dialogo", "significado"]));
  });
});

describe("correção", () => {
  const questions = buildLevelExitTest("B1", daySeed(DAY));
  const right = questions.map((q) => q.correct);

  it("tudo certo = 100% e passa", () => {
    expect(scoreLevelExitTest(questions, right)).toMatchObject({
      correct: 10,
      accuracy: 100,
      passed: true,
      weakUnits: [],
    });
  });

  it(`passa com ${EXIT_TEST_PASS_ACCURACY}% (7 de 10) e reprova com 6`, () => {
    const wrongAt = (n: number) =>
      right.map((c, i) => (i < n ? (c + 1) % questions[i]!.options.length : c));
    expect(scoreLevelExitTest(questions, wrongAt(3))).toMatchObject({ accuracy: 70, passed: true });
    expect(scoreLevelExitTest(questions, wrongAt(4))).toMatchObject({
      accuracy: 60,
      passed: false,
    });
  });

  it("'não sei' conta como erro e as unidades mais erradas vêm primeiro", () => {
    const result = scoreLevelExitTest(questions, Array(10).fill(-1));
    expect(result).toMatchObject({ correct: 0, accuracy: 0, passed: false });
    const misses = result.weakUnits.map((u) => u.misses);
    expect(misses).toEqual([...misses].sort((a, b) => b - a));
    expect(misses.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("prova vazia nunca passa", () => {
    expect(scoreLevelExitTest([], [])).toMatchObject({ accuracy: 0, passed: false });
  });
});

describe("limite de uma tentativa por dia", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("dayKey usa o dia local", () => {
    expect(dayKey(new Date(2026, 10, 21, 23, 59).getTime())).toBe("2026-11-21");
    expect(dayKey(new Date(2026, 0, 5, 0, 1).getTime())).toBe("2026-01-05");
  });

  it("começar gasta a tentativa do dia, passando ou não, e libera no dia seguinte", async () => {
    const store = await import("@/lib/trail-store");
    const state = () => store.trailCloudBinding.get();
    expect(store.canTryLevelExit(state(), "B1", DAY)).toBe(true);
    expect(store.startLevelExit("B1", DAY)).toBe(true);
    // Recarregar e tentar de novo no mesmo dia não funciona.
    expect(store.canTryLevelExit(state(), "B1", DAY)).toBe(false);
    expect(store.startLevelExit("B1", DAY + 60_000)).toBe(false);
    expect(store.getLevelExit(state(), "B1")?.attempts).toBe(1);
    // Outro nível tem a sua própria tentativa.
    expect(store.canTryLevelExit(state(), "A2", DAY)).toBe(true);
    // No dia seguinte pode de novo.
    expect(store.canTryLevelExit(state(), "B1", DAY + 86_400_000)).toBe(true);
  });

  it("guarda o melhor acerto e o momento em que passou, sem apagar depois", async () => {
    const store = await import("@/lib/trail-store");
    store.startLevelExit("B1", DAY);
    store.finishLevelExit("B1", 60, false, DAY);
    expect(store.getLevelExit(store.trailCloudBinding.get(), "B1")).toMatchObject({
      bestAccuracy: 60,
      passedAt: undefined,
    });

    const next = DAY + 86_400_000;
    store.startLevelExit("B1", next);
    store.finishLevelExit("B1", 80, true, next);
    store.startLevelExit("B1", next + 86_400_000);
    store.finishLevelExit("B1", 50, false, next + 86_400_000);
    expect(store.getLevelExit(store.trailCloudBinding.get(), "B1")).toMatchObject({
      attempts: 3,
      bestAccuracy: 80,
      passedAt: next,
    });
  });

  it("passar no teste não conta como atividade feita (não mexe em cursos nem progresso)", async () => {
    const store = await import("@/lib/trail-store");
    store.startLevelExit("A1", DAY);
    store.finishLevelExit("A1", 100, true, DAY);
    expect(store.getTotalDone(store.trailCloudBinding.get())).toBe(0);
    expect(store.getCoursesUnlock(store.trailCloudBinding.get()).unlocked).toBe(false);
  });

  it("progresso antigo (sem o campo) continua carregando", async () => {
    window.localStorage.setItem(
      "hi.trail.v1",
      JSON.stringify({ completed: { x: { at: 1, accuracy: 90, runs: 1 } } }),
    );
    const store = await import("@/lib/trail-store");
    expect(store.trailCloudBinding.get().levelExits).toEqual({});
    expect(store.canTryLevelExit(store.trailCloudBinding.get(), "A1", DAY)).toBe(true);
  });
});
