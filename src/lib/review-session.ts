import { getLesson, type LessonWord } from "@/lib/lessons";
import {
  makeDialogoQuestion,
  makeSignificadoQuestion,
  rng,
  roundRobin,
  type DialogoStep,
  type PracticeQuestion,
} from "@/lib/practice-questions";
import { getDueWordIds, type ReviewState } from "@/lib/review-store";
import { ACTIVITIES, COURSE_ACTIVITIES, getUnitOf, type Activity, type Unit } from "@/lib/trail";

/** Quantas perguntas tem cada sessão de revisão. */
export const REVIEW_SESSION_SIZE = 10;

/** Etapas cujas palavras entram na agenda (Recordar e Checkpoint só reciclam as mesmas). */
const REVIEWABLE_SKILLS = ["entrada", "aplicar", "falar"] as const;

export function isReviewableActivity(activity: Activity): boolean {
  return (REVIEWABLE_SKILLS as readonly string[]).includes(activity.skill);
}

type IndexedWord = { word: LessonWord; unit: Unit; dialogo?: DialogoStep };

let index: Map<string, IndexedWord> | null = null;
let unitWords: Map<string, LessonWord[]> | null = null;

/** Palavra → unidade, exemplo e (se for item de Aplicar) a conversa dela. Montado uma vez. */
function ensureIndex() {
  if (index && unitWords) return { index, unitWords };
  const words = new Map<string, IndexedWord>();
  const byUnit = new Map<string, LessonWord[]>();
  for (const activity of [...ACTIVITIES, ...COURSE_ACTIVITIES]) {
    if (!isReviewableActivity(activity)) continue;
    const lesson = getLesson(activity.lessonId);
    if (!lesson) continue;
    const unit = getUnitOf(activity);
    const dialogos = new Map<string, DialogoStep>();
    for (const step of lesson.steps) if (step.kind === "dialogo") dialogos.set(step.wordId, step);
    for (const word of lesson.words) {
      const entry: IndexedWord = { word, unit };
      const dialogo = dialogos.get(word.id);
      if (dialogo) entry.dialogo = dialogo;
      words.set(word.id, entry);
      byUnit.set(unit.id, [...(byUnit.get(unit.id) ?? []), word]);
    }
  }
  index = words;
  unitWords = byUnit;
  return { index, unitWords };
}

/** Ids da agenda que já podem ser revisados e que ainda existem no conteúdo atual. */
export function getReviewDue(current: ReviewState, now: number): string[] {
  const { index: known } = ensureIndex();
  return getDueWordIds(current, now).filter((id) => known.has(id));
}

/**
 * Monta a sessão do dia: até `size` perguntas das palavras vencidas, da mais atrasada para a mais
 * recente, intercaladas entre as unidades (a revisão mistura assuntos de propósito). Palavras de
 * Aplicar viram, às vezes, uma conversa; as demais, "o que isto significa?".
 */
export function buildReviewSession(
  current: ReviewState,
  now: number,
  seed: number,
  size: number = REVIEW_SESSION_SIZE,
): PracticeQuestion[] {
  const { index: known, unitWords: pools } = ensureIndex();
  const random = rng(seed);

  // Palavras vencidas agrupadas por unidade; a unidade com a palavra mais atrasada vem primeiro.
  const groups = new Map<string, IndexedWord[]>();
  for (const id of getReviewDue(current, now)) {
    const entry = known.get(id)!;
    groups.set(entry.unit.id, [...(groups.get(entry.unit.id) ?? []), entry]);
  }

  return roundRobin([...groups.values()], size).map((entry) => {
    if (entry.dialogo && random() < 0.5)
      return makeDialogoQuestion(entry.unit, entry.dialogo, random);
    return makeSignificadoQuestion(entry.unit, entry.word, pools.get(entry.unit.id) ?? [], random);
  });
}
