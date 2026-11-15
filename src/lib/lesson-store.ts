import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";
import { getLesson, type Lesson } from "@/lib/lessons";
import { registerActivity } from "@/lib/streak-store";
import { recordLessonResult } from "@/lib/trail-store";

/** Quão longe cada palavra já foi: 1 descoberta · 2 reconhecida · 3 recordada · 4 usada. */
export type WordStage = 0 | 1 | 2 | 3 | 4;

export type StepResult = { index: number; correct: boolean | null };

export type LessonSummary = {
  accuracy: number;
  minutes: number;
  streak: number;
  streakGained: boolean;
  missedWordIds: string[];
};

export type LessonSession = {
  lessonId: string;
  stepIndex: number;
  startedAt: number;
  results: StepResult[];
  missedWordIds: string[];
  summary?: LessonSummary;
};

type State = {
  session: LessonSession | null;
  wordStages: Record<string, WordStage>;
  firstTryHits: number;
  firstTryTotal: number;
};

const STORAGE_KEY = "hi.lessons.v1";

function emptyState(): State {
  return { session: null, wordStages: {}, firstTryHits: 0, firstTryTotal: 0 };
}

function normalize(parsed: Partial<State> | null | undefined): State {
  return {
    session: parsed?.session ?? null,
    wordStages: parsed?.wordStages ?? {},
    firstTryHits: parsed?.firstTryHits ?? 0,
    firstTryTotal: parsed?.firstTryTotal ?? 0,
  };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw) as Partial<State>);
  } catch {
    return emptyState();
  }
}

function persist(next: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full — state still works in-memory for this session
  }
}

const SERVER_SNAPSHOT: State = emptyState();

let state: State | null = null;
const listeners = new Set<() => void>();

function ensureState(): State {
  if (state === null) state = loadState();
  return state;
}

function setState(next: State) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): State {
  return ensureState();
}

function getServerSnapshot(): State {
  return SERVER_SNAPSHOT;
}

function withStage(
  stages: Record<string, WordStage>,
  wordId: string,
  stage: WordStage,
): Record<string, WordStage> {
  if ((stages[wordId] ?? 0) >= stage) return stages;
  return { ...stages, [wordId]: stage };
}

export function startLesson(lessonId: string) {
  const s = ensureState();
  setState({
    ...s,
    session: { lessonId, stepIndex: 0, startedAt: Date.now(), results: [], missedWordIds: [] },
  });
}

/** Marca palavras como descobertas ("Entendi" na tela Descobrir). */
export function markDiscovered(wordId: string) {
  const s = ensureState();
  setState({ ...s, wordStages: withStage(s.wordStages, wordId, 1) });
}

/**
 * Registra o resultado de uma etapa. Idempotente por índice: só conta a primeira vez
 * (acerto na 1ª tentativa), então duplo clique ou re-render não inflam os números.
 * `wordIds` são as palavras trabalhadas; `missedWordIds` as que a pessoa errou.
 */
export function recordStep(
  index: number,
  data: { correct: boolean; wordIds: string[]; missedWordIds: string[]; reachedStage: WordStage },
) {
  const s = ensureState();
  const session = s.session;
  if (!session || session.results.some((r) => r.index === index)) return;

  let stages = s.wordStages;
  for (const wordId of data.wordIds) {
    if (!data.missedWordIds.includes(wordId)) stages = withStage(stages, wordId, data.reachedStage);
  }
  const missed = [...new Set([...session.missedWordIds, ...data.missedWordIds])];
  setState({
    ...s,
    wordStages: stages,
    firstTryHits: s.firstTryHits + (data.correct ? 1 : 0),
    firstTryTotal: s.firstTryTotal + 1,
    session: {
      ...session,
      results: [...session.results, { index, correct: data.correct }],
      missedWordIds: missed,
    },
  });
}

export function advanceStep(from: number) {
  const s = ensureState();
  if (!s.session || s.session.stepIndex > from) return;
  setState({ ...s, session: { ...s.session, stepIndex: from + 1 } });
}

/** Fecha a lição: calcula o resumo e registra a atividade do dia (sequência). Idempotente. */
export function finishLesson(): LessonSummary | null {
  const s = ensureState();
  const session = s.session;
  if (!session) return null;
  if (session.summary) return session.summary;

  const graded = session.results.filter((r) => r.correct !== null);
  const hits = graded.filter((r) => r.correct).length;
  const activity = registerActivity();
  const summary: LessonSummary = {
    accuracy: graded.length === 0 ? 100 : Math.round((100 * hits) / graded.length),
    minutes: Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)),
    streak: activity.streak,
    streakGained: activity.isFirstToday,
    missedWordIds: session.missedWordIds,
  };
  setState({ ...s, session: { ...session, summary } });
  // Se a lição é uma atividade da trilha, ela passa a contar lá (e o atalho da Home avança junto).
  recordLessonResult(session.lessonId, summary.accuracy);
  return summary;
}

export function getWordsAtStage(current: State, minStage: 1 | 2 | 3 | 4): number {
  return Object.values(current.wordStages).filter((stage) => stage >= minStage).length;
}

export function getFirstTryPct(current: State): number | null {
  if (current.firstTryTotal === 0) return null;
  return Math.round((100 * current.firstTryHits) / current.firstTryTotal);
}

/** Quantas das 4 etapas já foram alcançadas por pelo menos uma palavra da lição (0–4). */
export function getLessonStagesReached(current: State, lesson: Lesson): number {
  const best = Math.max(0, ...lesson.words.map((w) => current.wordStages[w.id] ?? 0));
  return best;
}

export function getActiveSession(current: State, lessonId: string): LessonSession | null {
  const session = current.session;
  if (!session || session.lessonId !== lessonId || session.summary) return null;
  return getLesson(lessonId) ? session : null;
}

/** Ligação com o Firestore (users/{uid}/data/lessons). Ver cloud-sync.ts. */
export const lessonCloudBinding: CloudBinding<State> = {
  field: "lessons",
  empty: emptyState,
  get: ensureState,
  replace: (remote) => setState(normalize(remote)),
  subscribe,
};

export function useLessonStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
