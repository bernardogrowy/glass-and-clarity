import { useSyncExternalStore } from "react";

export type ChatMessage = { from: "hi" | "me"; text: string; fix?: string };

export type Conversation = {
  id: string;
  missionTitle: string;
  startedAt: number;
  endedAt: number;
  messages: ChatMessage[];
  score: number;
  newWords: string[];
};

type State = { conversations: Conversation[]; hasOnboarded: boolean };

const STORAGE_KEY = "hi.chat.v1";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyState(): State {
  return { conversations: [], hasOnboarded: false };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      conversations: parsed.conversations ?? [],
      hasOnboarded: parsed.hasOnboarded ?? false,
    };
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

export function markOnboarded() {
  const s = ensureState();
  if (s.hasOnboarded) return;
  setState({ ...s, hasOnboarded: true });
}

export function saveConversation(data: {
  missionTitle: string;
  startedAt: number;
  messages: ChatMessage[];
  score: number;
  newWords: string[];
}): Conversation {
  const s = ensureState();
  const conversation: Conversation = { id: createId(), endedAt: Date.now(), ...data };
  setState({ ...s, conversations: [conversation, ...s.conversations] });
  return conversation;
}

export function useChatStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
