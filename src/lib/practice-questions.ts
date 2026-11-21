import type { LessonStep, LessonWord } from "@/lib/lessons";
import type { Unit } from "@/lib/trail";

/**
 * Perguntas de múltipla escolha tiradas do conteúdo da trilha. Servem ao teste para avançar de
 * nível (`level-exit-test.ts`) e à revisão espaçada (`review-session.ts`).
 */

export type PracticeQuestion = {
  id: string;
  /** Palavra (id do item) a que a pergunta se refere. */
  wordId: string;
  unitId: string;
  unitTitle: string;
  kind: "dialogo" | "significado";
  /** Instrução curta, em português. */
  instruction: string;
  /** Texto principal: a fala da Hi (diálogo) ou a expressão em inglês (significado). */
  prompt: string;
  /** Tradução da fala da Hi (só no diálogo). */
  promptPt?: string;
  /** Diálogo: a resposta com a lacuna no meio. */
  sentence?: { before: string; after: string };
  options: string[];
  /** Índice da opção certa em `options`. */
  correct: number;
  /** Frase de exemplo completa, para mostrar depois da resposta (quando existir). */
  example?: { en: string; pt: string };
};

/** Gerador pseudoaleatório com semente: o mesmo `seed` dá sempre a mesma sequência. */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

/** Pega itens das listas por rodízio (1º de cada, depois o 2º de cada…) até juntar `count`. */
export function roundRobin<T>(lists: T[][], count: number): T[] {
  const picked: T[] = [];
  for (let round = 0; picked.length < count; round++) {
    let any = false;
    for (const list of lists) {
      const item = list[round];
      if (item === undefined) continue;
      any = true;
      if (picked.length < count) picked.push(item);
    }
    if (!any) break;
  }
  return picked;
}

export type DialogoStep = Extract<LessonStep, { kind: "dialogo" }>;

/** "Complete a resposta": a lacuna do item, com as opções embaralhadas. */
export function makeDialogoQuestion(
  unit: Unit,
  step: DialogoStep,
  random: () => number,
): PracticeQuestion {
  const options = shuffled(step.options, random);
  return {
    id: `${unit.id}:dialogo:${step.wordId}`,
    wordId: step.wordId,
    unitId: unit.id,
    unitTitle: unit.title,
    kind: "dialogo",
    instruction: "Complete a resposta com a opção certa.",
    prompt: step.hi,
    promptPt: step.hiPt,
    sentence: { before: step.before, after: step.after },
    options,
    correct: options.indexOf(step.correct),
    example: {
      en: `${step.before} ${step.correct} ${step.after}`.replace(/\s+/g, " ").trim(),
      pt: step.answerPt,
    },
  };
}

/** "O que isto significa?": o significado certo mais até 3 de outras palavras de `pool`. */
export function makeSignificadoQuestion(
  unit: Unit,
  word: LessonWord,
  pool: readonly LessonWord[],
  random: () => number,
): PracticeQuestion {
  const distractors = shuffled(
    pool.filter((w) => w.id !== word.id && w.pt !== word.pt),
    random,
  )
    .map((w) => w.pt)
    .filter((pt, i, all) => all.indexOf(pt) === i)
    .slice(0, 3);
  const options = shuffled([word.pt, ...distractors], random);
  return {
    id: `${unit.id}:significado:${word.id}`,
    wordId: word.id,
    unitId: unit.id,
    unitTitle: unit.title,
    kind: "significado",
    instruction: "O que isto significa?",
    prompt: word.en,
    options,
    correct: options.indexOf(word.pt),
    example: { en: word.example, pt: word.examplePt },
  };
}
