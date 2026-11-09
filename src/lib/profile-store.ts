import { useSyncExternalStore } from "react";

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type AvatarExpression = "duvida" | "duvida-intensa" | "piscada" | "sorriso";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const AVATAR_COLORS = [
  "#F2B705",
  "#F2994A",
  "#F2555A",
  "#F2719A",
  "#B98AE3",
  "#8A8FEA",
  "#5AA9E6",
  "#4FD1C5",
  "#6FCF97",
  "#C6E86B",
];

export const AVATAR_EXPRESSIONS: AvatarExpression[] = [
  "duvida",
  "duvida-intensa",
  "piscada",
  "sorriso",
];

type ProfileState = {
  name: string;
  level: Level;
  avatarColor: string;
  avatarExpression: AvatarExpression;
};

const STORAGE_KEY = "hi.profile.v1";
const DEFAULT_STATE: ProfileState = {
  name: "Samson",
  level: "B1",
  avatarColor: AVATAR_COLORS[0] ?? "#F2B705",
  avatarExpression: "duvida",
};

function loadState(): ProfileState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ProfileState>;
    return {
      name: parsed.name ?? DEFAULT_STATE.name,
      level: parsed.level ?? DEFAULT_STATE.level,
      avatarColor: parsed.avatarColor ?? DEFAULT_STATE.avatarColor,
      avatarExpression: parsed.avatarExpression ?? DEFAULT_STATE.avatarExpression,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persist(next: ProfileState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full — state still works in-memory for this session
  }
}

let state: ProfileState | null = null;
const listeners = new Set<() => void>();

function ensureState(): ProfileState {
  if (state === null) state = loadState();
  return state;
}

function setState(next: ProfileState) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ProfileState {
  return ensureState();
}

function getServerSnapshot(): ProfileState {
  return DEFAULT_STATE;
}

export function updateProfile(next: {
  name: string;
  level: Level;
  avatarColor: string;
  avatarExpression: AvatarExpression;
}) {
  setState({
    name: next.name.trim() || DEFAULT_STATE.name,
    level: next.level,
    avatarColor: next.avatarColor,
    avatarExpression: next.avatarExpression,
  });
}

export function useProfileStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
