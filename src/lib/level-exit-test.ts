import { getLesson } from "@/lib/lessons";
import {
  makeDialogoQuestion,
  makeSignificadoQuestion,
  rng,
  roundRobin,
  shuffled,
  type DialogoStep,
  type PracticeQuestion,
} from "@/lib/practice-questions";
import { CHECKPOINT_PASS_ACCURACY, SECTIONS, type Unit } from "@/lib/trail";

/**
 * Teste para sair de um nível: a pessoa que já domina o nível que está seguindo responde a
 * perguntas tiradas das unidades dele e, com acerto suficiente, avança para o próximo nível sem
 * fazer as atividades uma a uma. Tudo aqui é puro (sem React nem armazenamento): o registro das
 * tentativas fica em `trail-store.ts`.
 */

export const EXIT_TEST_QUESTIONS = 10;
/** Quantas das perguntas são de "usar numa conversa" (o resto é de significado). */
const DIALOGO_COUNT = 6;
/** Mesma régua do checkpoint de unidade. */
export const EXIT_TEST_PASS_ACCURACY = CHECKPOINT_PASS_ACCURACY;

/** Mesmo formato das perguntas da revisão espaçada. */
export type ExitQuestion = PracticeQuestion;

/** Unidades do nível (todas as seções daquele nível). */
export function getLevelUnits(level: string): Unit[] {
  return SECTIONS.filter((s) => s.level === level).flatMap((s) => s.units);
}

type DialogoSource = { unit: Unit; step: DialogoStep };

/**
 * Monta a prova do nível, sempre com `EXIT_TEST_QUESTIONS` perguntas espalhadas por todas as
 * unidades (em rodízio). O `seed` (por exemplo, o dia) muda quais perguntas caem.
 */
export function buildLevelExitTest(level: string, seed: number): ExitQuestion[] {
  const random = rng(seed * 7919 + level.charCodeAt(0) * 31 + level.charCodeAt(1));
  const units = getLevelUnits(level);

  // Vocabulário do nível inteiro: serve de fonte das perguntas e dos distratores.
  const allWords = units.flatMap((unit) =>
    unit.activities
      .filter((a) => a.skill === "entrada")
      .flatMap((a) => (getLesson(a.lessonId)?.words ?? []).map((word) => ({ unit, word }))),
  );

  const dialogoByUnit = units.map((unit) => {
    const sources: DialogoSource[] = [];
    for (const activity of unit.activities.filter((a) => a.skill === "aplicar")) {
      for (const step of getLesson(activity.lessonId)?.steps ?? []) {
        if (step.kind === "dialogo") sources.push({ unit, step });
      }
    }
    return shuffled(sources, random);
  });

  const dialogos = roundRobin(dialogoByUnit, DIALOGO_COUNT).map(({ unit, step }) =>
    makeDialogoQuestion(unit, step, random),
  );

  const usedWords = new Set(dialogos.map((q) => q.wordId));
  const wordByUnit = units.map((unit) =>
    shuffled(
      allWords.filter((w) => w.unit.id === unit.id && !usedWords.has(w.word.id)),
      random,
    ),
  );
  const poolWords = allWords.map((w) => w.word);
  const significados = roundRobin(wordByUnit, EXIT_TEST_QUESTIONS - dialogos.length).map(
    ({ unit, word }) => makeSignificadoQuestion(unit, word, poolWords, random),
  );

  // Mistura as duas famílias, mas sem perder a ordem aleatória dentro de cada uma.
  return shuffled([...dialogos, ...significados], random);
}

export type ExitResult = {
  correct: number;
  total: number;
  accuracy: number;
  passed: boolean;
  /** Unidades em que a pessoa errou, da que mais errou para a que menos errou. */
  weakUnits: { unitId: string; unitTitle: string; misses: number }[];
};

/** Corrige a prova: `answers[i]` é o índice escolhido na pergunta `i` (`-1` = não sei). */
export function scoreLevelExitTest(
  questions: readonly ExitQuestion[],
  answers: readonly number[],
): ExitResult {
  let correct = 0;
  const misses = new Map<string, { unitTitle: string; misses: number }>();
  questions.forEach((q, i) => {
    if (answers[i] === q.correct) {
      correct += 1;
      return;
    }
    const entry = misses.get(q.unitId) ?? { unitTitle: q.unitTitle, misses: 0 };
    entry.misses += 1;
    misses.set(q.unitId, entry);
  });
  const total = questions.length;
  const accuracy = total === 0 ? 0 : Math.round((100 * correct) / total);
  return {
    correct,
    total,
    accuracy,
    passed: total > 0 && accuracy >= EXIT_TEST_PASS_ACCURACY,
    weakUnits: [...misses.entries()]
      .map(([unitId, v]) => ({ unitId, ...v }))
      .sort((a, b) => b.misses - a.misses),
  };
}

/** Chave do dia no fuso local ("2026-11-21"): é por ela que se limita uma tentativa por dia. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Número do dia (para usar de semente): muda a prova a cada dia. */
export function daySeed(now: number): number {
  const d = new Date(now);
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}
