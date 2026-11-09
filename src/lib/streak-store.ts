import { useSyncExternalStore } from "react";

export type StreakState = {
  current: number;
  longest: number;
  lastActiveDate: string | null; // yyyy-mm-dd, local time
  activeDates: string[]; // every calendar day (yyyy-mm-dd) with at least one valid activity
};

const STORAGE_KEY = "hi.streak.v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_DAYS = 730; // ~2 years of history is plenty for the calendar view

function emptyState(): StreakState {
  return { current: 0, longest: 0, lastActiveDate: null, activeDates: [] };
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState(): StreakState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      current: parsed.current ?? 0,
      longest: parsed.longest ?? 0,
      lastActiveDate: parsed.lastActiveDate ?? null,
      activeDates: parsed.activeDates ?? [],
    };
  } catch {
    return emptyState();
  }
}

function persist(next: StreakState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full — state still works in-memory for this session
  }
}

const SERVER_SNAPSHOT: StreakState = emptyState();

let state: StreakState | null = null;
const listeners = new Set<() => void>();

function ensureState(): StreakState {
  if (state === null) state = loadState();
  return state;
}

function setState(next: StreakState) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StreakState {
  return ensureState();
}

function getServerSnapshot(): StreakState {
  return SERVER_SNAPSHOT;
}

/**
 * Registers that a valid activity happened right now. Call this from any
 * screen that completes one of the activities that count toward the streak
 * (finishing a mission, a vocabulary review, a goal step, …). Bumping the
 * streak and showing the celebration only happens once per calendar day —
 * extra calls on the same day are silent.
 */
export function registerActivity(): { streak: number; isFirstToday: boolean } {
  const s = ensureState();
  const today = dayKey(new Date());
  if (s.lastActiveDate === today) {
    return { streak: s.current, isFirstToday: false };
  }
  const yesterday = dayKey(new Date(Date.now() - DAY_MS));
  const nextCurrent = s.lastActiveDate === yesterday ? s.current + 1 : 1;
  const next: StreakState = {
    current: nextCurrent,
    longest: Math.max(s.longest, nextCurrent),
    lastActiveDate: today,
    activeDates: [...s.activeDates, today].slice(-MAX_TRACKED_DAYS),
  };
  setState(next);
  return { streak: nextCurrent, isFirstToday: true };
}

export function isDateActive(state: StreakState, date: Date): boolean {
  return state.activeDates.includes(dayKey(date));
}

export function getStreakTier(current: number): string {
  if (current >= 30) return "Imparável";
  if (current >= 7) return "Consistente";
  if (current >= 3) return "Pegando ritmo";
  return "Começando";
}

export function getStreakInsight(state: StreakState): string {
  if (state.current === 0)
    return "Toda sequência começa com um dia — pratique hoje pra começar a sua.";
  if (state.longest > state.current) {
    const diff = state.longest - state.current;
    return `Faltam ${diff} dia${diff === 1 ? "" : "s"} pra bater seu recorde de ${state.longest} dias seguidos.`;
  }
  if (state.current > 1) return "Essa é a sua sequência mais longa até agora!";
  return "Volte amanhã pra manter sua sequência viva.";
}

export function useStreakStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
