import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";
import { dayKey } from "@/lib/level-exit-test";
import { enrollWords } from "@/lib/review-store";
import { isReviewableActivity } from "@/lib/review-session";
import {
  ACTIVITIES,
  CHECKPOINT_PASS_ACCURACY,
  EXTRA_COURSES_UNLOCK_ACTIVITIES,
  UNITS,
  getActivity,
  getCourseOfActivity,
  getCourseOfUnit,
  getPreviousActivity,
  getSectionOf,
  getTrackActivities,
  getUnitOf,
  getVisibleUnits,
  isReviewSection,
  type Activity,
  type Course,
  type Unit,
} from "@/lib/trail";

export type ActivityRecord = {
  /** Quando foi concluída pela primeira vez. */
  at: number;
  /** Melhor acerto (%) entre todas as vezes que a atividade foi feita. */
  accuracy: number;
  runs: number;
};

/** Teste para sair de um nível (por nível CEFR). */
export type LevelExitRecord = {
  /** Dia da última tentativa ("2026-11-21"): só uma por dia. */
  lastAttemptDay: string;
  attempts: number;
  /** Melhor acerto (%) entre as tentativas já terminadas. */
  bestAccuracy: number;
  /** Quando passou (o nível foi pulado por teste); ausente enquanto não passou. */
  passedAt?: number;
};

type State = {
  completed: Record<string, ActivityRecord>;
  /** Níveis com teste de saída já tentado; separado do que foi estudado de fato. */
  levelExits: Record<string, LevelExitRecord>;
};

export type TrailState = State;
export type ActivityStatus = "concluida" | "atual" | "bloqueada";

const STORAGE_KEY = "hi.trail.v1";

function emptyState(): State {
  return { completed: {}, levelExits: {} };
}

function normalize(parsed: Partial<State> | null | undefined): State {
  return { completed: parsed?.completed ?? {}, levelExits: parsed?.levelExits ?? {} };
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

/**
 * Chamado quando uma lição é fechada (`finishLesson`). Se ela pertence à trilha, marca a
 * atividade como concluída — não importa se a pessoa abriu pela trilha ou pelo atalho da Home.
 * O checkpoint só conclui com acerto suficiente; as demais concluem sempre (o que errou volta
 * na revisão de amanhã). Refazer nunca "desconclui" nem baixa o melhor acerto.
 */
export function recordLessonResult(
  lessonId: string,
  accuracy: number,
): { activityId: string; completed: boolean } | null {
  const activity = getActivity(lessonId);
  if (!activity) return null;

  const s = ensureState();
  // Lição de curso ainda bloqueada (aberta pela URL): não registra nada.
  if (isLessonLocked(s, lessonId)) return null;
  const previous = s.completed[activity.id];
  const passed = activity.skill !== "checkpoint" || accuracy >= CHECKPOINT_PASS_ACCURACY;
  if (!previous && !passed) return { activityId: activity.id, completed: false };

  setState({
    ...s,
    completed: {
      ...s.completed,
      [activity.id]: {
        at: previous?.at ?? Date.now(),
        accuracy: Math.max(previous?.accuracy ?? 0, accuracy),
        runs: (previous?.runs ?? 0) + 1,
      },
    },
  });
  // As palavras da atividade entram na agenda de revisão (volta amanhã, depois em 3, 7, 14, 30 dias).
  if (isReviewableActivity(activity)) enrollWords(activity.wordIds);
  return { activityId: activity.id, completed: true };
}

export function isActivityDone(current: State, activityId: string): boolean {
  return current.completed[activityId] !== undefined;
}

/** A atividade está numa seção de revisão (nível abaixo do que a pessoa segue)? Sem `level`, nunca. */
function isReviewActivity(activity: Activity, level?: string): boolean {
  return level !== undefined && isReviewSection(getSectionOf(getUnitOf(activity)), level);
}

/**
 * Liberação linear: tudo antes da primeira atividade pendente está concluído; ela é a "atual".
 * Com `level` (nível do perfil), só conta a trilha do nível da pessoa — as seções de revisão
 * (níveis abaixo) ficam abertas e não travam nem viram "atual".
 */
export function getCurrent(
  current: State,
  level?: string,
): { unit: Unit; activity: Activity } | null {
  const track = level === undefined ? ACTIVITIES : getTrackActivities(level);
  const activity = track.find((a) => !isActivityDone(current, a.id));
  return activity ? { activity, unit: getUnitOf(activity) } : null;
}

export function getActivityStatus(
  current: State,
  activity: Activity,
  level?: string,
): ActivityStatus {
  if (isActivityDone(current, activity.id)) return "concluida";
  if (isReviewActivity(activity, level)) return "atual";
  const previous = getPreviousActivity(activity);
  if (!previous || isReviewActivity(previous, level)) return "atual";
  return isActivityDone(current, previous.id) ? "atual" : "bloqueada";
}

export function getUnitProgress(current: State, unit: Unit) {
  const done = unit.activities.filter((a) => isActivityDone(current, a.id)).length;
  const total = unit.activities.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((100 * done) / total) };
}

export function isUnitDone(current: State, unit: Unit): boolean {
  return (
    unit.activities.length > 0 && getUnitProgress(current, unit).done === unit.activities.length
  );
}

export function isUnitUnlocked(current: State, unit: Unit, level?: string): boolean {
  const first = unit.activities[0];
  return !!first && getActivityStatus(current, first, level) !== "bloqueada";
}

export function getUnitStatus(current: State, unit: Unit, level?: string): ActivityStatus {
  if (isUnitDone(current, unit)) return "concluida";
  return isUnitUnlocked(current, unit, level) ? "atual" : "bloqueada";
}

/**
 * Unidade anterior/seguinte na ordem da trilha (atravessa seções; com `level`, só as visíveis).
 * Unidade de curso extra: vizinha dentro do próprio curso.
 */
export function getAdjacentUnit(unit: Unit, offset: -1 | 1, level?: string): Unit | undefined {
  const course = getCourseOfUnit(unit);
  const units = course ? course.units : level === undefined ? UNITS : getVisibleUnits(level);
  const i = units.findIndex((u) => u.id === unit.id);
  return i === -1 ? undefined : units[i + offset];
}

// ---------------------------------------------------------------------------------------------
// Cursos extras: cada curso tem a sua própria ordem de liberação (linear dentro dele).
// ---------------------------------------------------------------------------------------------

function courseActivities(course: Course): Activity[] {
  return course.units.flatMap((u) => u.activities);
}

export function getCourseActivityStatus(
  current: State,
  course: Course,
  activity: Activity,
): ActivityStatus {
  if (isActivityDone(current, activity.id)) return "concluida";
  const list = courseActivities(course);
  const previous = list[list.findIndex((a) => a.id === activity.id) - 1];
  return !previous || isActivityDone(current, previous.id) ? "atual" : "bloqueada";
}

/** A próxima atividade pendente do curso (a "atual"), ou `null` se o curso está concluído/vazio. */
export function getCourseCurrent(
  current: State,
  course: Course,
): { unit: Unit; activity: Activity } | null {
  const activity = courseActivities(course).find((a) => !isActivityDone(current, a.id));
  const unit = activity && course.units.find((u) => u.id === activity.unitId);
  return activity && unit ? { activity, unit } : null;
}

export function getCourseProgress(current: State, course: Course) {
  const list = courseActivities(course);
  const done = list.filter((a) => isActivityDone(current, a.id)).length;
  return {
    done,
    total: list.length,
    pct: list.length === 0 ? 0 : Math.round((100 * done) / list.length),
  };
}

/** Quantas atividades da trilha já foram concluídas no total. */
export function getTotalDone(current: State): number {
  return ACTIVITIES.filter((a) => isActivityDone(current, a.id)).length;
}

/**
 * Os cursos extras abrem depois de `EXTRA_COURSES_UNLOCK_ACTIVITIES` atividades da trilha
 * principal. Atividades dos próprios cursos não contam (senão eles se liberariam sozinhos).
 */
export function getCoursesUnlock(current: State) {
  const needed = EXTRA_COURSES_UNLOCK_ACTIVITIES;
  const total = getTotalDone(current);
  return {
    unlocked: total >= needed,
    done: Math.min(total, needed),
    needed,
    remaining: Math.max(0, needed - total),
  };
}

/**
 * Lição de curso extra ainda bloqueada? Vale para qualquer entrada (trilha, atalho ou URL digitada):
 * enquanto os cursos não abrem, nenhuma atividade deles pode ser iniciada nem registrada.
 * Lições da trilha principal e ids desconhecidos nunca são "bloqueados" por aqui.
 */
export function isLessonLocked(current: State, lessonId: string): boolean {
  const activity = getActivity(lessonId);
  if (!activity || !getCourseOfActivity(activity)) return false;
  return !getCoursesUnlock(current).unlocked;
}

// ---------------------------------------------------------------------------------------------
// Teste para sair de um nível: uma tentativa por dia, por nível.
// ---------------------------------------------------------------------------------------------

/** Pode fazer o teste de saída do nível hoje? (Só uma tentativa por dia, passando ou não.) */
export function canTryLevelExit(current: State, level: string, now: number): boolean {
  return current.levelExits[level]?.lastAttemptDay !== dayKey(now);
}

export function getLevelExit(current: State, level: string): LevelExitRecord | undefined {
  return current.levelExits[level];
}

/**
 * Começa uma tentativa: gasta a tentativa do dia já aqui (e não só ao terminar), para que
 * recarregar a página não permita rever as perguntas e tentar de novo. Devolve `false` se a
 * pessoa já tentou hoje.
 */
export function startLevelExit(level: string, now: number): boolean {
  const s = ensureState();
  if (!canTryLevelExit(s, level, now)) return false;
  const previous = s.levelExits[level];
  setState({
    ...s,
    levelExits: {
      ...s.levelExits,
      [level]: {
        lastAttemptDay: dayKey(now),
        attempts: (previous?.attempts ?? 0) + 1,
        bestAccuracy: previous?.bestAccuracy ?? 0,
        passedAt: previous?.passedAt,
      },
    },
  });
  return true;
}

/** Guarda o resultado da tentativa em andamento (melhor acerto e, se passou, quando). */
export function finishLevelExit(level: string, accuracy: number, passed: boolean, now: number) {
  const s = ensureState();
  const previous = s.levelExits[level];
  if (!previous) return;
  setState({
    ...s,
    levelExits: {
      ...s.levelExits,
      [level]: {
        ...previous,
        bestAccuracy: Math.max(previous.bestAccuracy, accuracy),
        passedAt: previous.passedAt ?? (passed ? now : undefined),
      },
    },
  });
}

/** Ligação com o Firestore (users/{uid}/data/trail). Ver cloud-sync.ts. */
export const trailCloudBinding: CloudBinding<State> = {
  field: "trail",
  empty: emptyState,
  get: ensureState,
  replace: (remote) => setState(normalize(remote)),
  subscribe,
};

export function useTrailStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
