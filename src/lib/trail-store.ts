import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";
import {
  ACTIVITIES,
  CHECKPOINT_PASS_ACCURACY,
  UNITS,
  getActivity,
  getPreviousActivity,
  getUnitOf,
  type Activity,
  type Unit,
} from "@/lib/trail";

export type ActivityRecord = {
  /** Quando foi concluída pela primeira vez. */
  at: number;
  /** Melhor acerto (%) entre todas as vezes que a atividade foi feita. */
  accuracy: number;
  runs: number;
};

type State = {
  completed: Record<string, ActivityRecord>;
};

export type TrailState = State;
export type ActivityStatus = "concluida" | "atual" | "bloqueada";

const STORAGE_KEY = "hi.trail.v1";

function emptyState(): State {
  return { completed: {} };
}

function normalize(parsed: Partial<State> | null | undefined): State {
  return { completed: parsed?.completed ?? {} };
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
  return { activityId: activity.id, completed: true };
}

export function isActivityDone(current: State, activityId: string): boolean {
  return current.completed[activityId] !== undefined;
}

/** Liberação linear: tudo antes da primeira atividade pendente está concluído; ela é a "atual". */
export function getCurrent(current: State): { unit: Unit; activity: Activity } | null {
  const activity = ACTIVITIES.find((a) => !isActivityDone(current, a.id));
  return activity ? { activity, unit: getUnitOf(activity) } : null;
}

export function getActivityStatus(current: State, activity: Activity): ActivityStatus {
  if (isActivityDone(current, activity.id)) return "concluida";
  const previous = getPreviousActivity(activity);
  return !previous || isActivityDone(current, previous.id) ? "atual" : "bloqueada";
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

export function isUnitUnlocked(current: State, unit: Unit): boolean {
  const first = unit.activities[0];
  return !!first && getActivityStatus(current, first) !== "bloqueada";
}

export function getUnitStatus(current: State, unit: Unit): ActivityStatus {
  if (isUnitDone(current, unit)) return "concluida";
  return isUnitUnlocked(current, unit) ? "atual" : "bloqueada";
}

/** Unidade anterior/seguinte na ordem da trilha (atravessa seções). */
export function getAdjacentUnit(unit: Unit, offset: -1 | 1): Unit | undefined {
  const i = UNITS.findIndex((u) => u.id === unit.id);
  return UNITS[i + offset];
}

/** Quantas atividades da trilha já foram concluídas no total. */
export function getTotalDone(current: State): number {
  return ACTIVITIES.filter((a) => isActivityDone(current, a.id)).length;
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
