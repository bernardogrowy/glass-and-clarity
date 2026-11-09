import { useSyncExternalStore } from "react";

export type Difficulty = "dificil" | "medio" | "facil";

export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  example?: string | undefined;
  dueAt: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt?: number;
  createdAt: number;
};

export type Deck = {
  id: string;
  name: string;
  tone: string;
  createdAt: number;
};

export type SrsSettings = {
  dificilDays: number;
  medioDays: number;
  facilDays: number;
};

type State = {
  decks: Deck[];
  cards: Card[];
  settings: SrsSettings;
};

const STORAGE_KEY = "hi.flashcards.v1";
const DAY_MS = 24 * 60 * 60 * 1000;
export const DECK_TONES = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac", "bg-butter"];

function pickTone(index: number): string {
  return DECK_TONES[index % DECK_TONES.length] ?? "bg-mint";
}
const DEFAULT_SETTINGS: SrsSettings = { dificilDays: 1, medioDays: 3, facilDays: 7 };

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function seedState(): State {
  const deckId = createId();
  const now = Date.now();
  const seedCards: Array<Pick<Card, "front" | "back" | "example">> = [
    {
      front: "Grab a coffee",
      back: "tomar um café",
      example: "Do you want to grab a coffee after work?",
    },
    { front: "Deadline", back: "prazo", example: "The deadline for the report is Friday." },
    {
      front: "Boarding pass",
      back: "cartão de embarque",
      example: "Please show your boarding pass at the gate.",
    },
    { front: "Hang out", back: "passar tempo junto", example: "We usually hang out at the park." },
  ];
  return {
    decks: [{ id: deckId, name: "Fim de semana", tone: pickTone(0), createdAt: now }],
    cards: seedCards.map((c) => ({
      id: createId(),
      deckId,
      ...c,
      dueAt: now,
      intervalDays: 0,
      reviewCount: 0,
      createdAt: now,
    })),
    settings: DEFAULT_SETTINGS,
  };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      decks: parsed.decks ?? [],
      cards: parsed.cards ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return seedState();
  }
}

function persist(next: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full — state still works in-memory for this session
  }
}

const SERVER_SNAPSHOT: State = { decks: [], cards: [], settings: DEFAULT_SETTINGS };

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

export function createDeck(name: string): Deck {
  const s = ensureState();
  const deck: Deck = {
    id: createId(),
    name,
    tone: pickTone(s.decks.length),
    createdAt: Date.now(),
  };
  setState({ ...s, decks: [...s.decks, deck] });
  return deck;
}

export function deleteDeck(deckId: string) {
  const s = ensureState();
  setState({
    ...s,
    decks: s.decks.filter((d) => d.id !== deckId),
    cards: s.cards.filter((c) => c.deckId !== deckId),
  });
}

export function addCard(
  deckId: string,
  data: { front: string; back: string; example?: string | undefined },
): Card {
  const s = ensureState();
  const now = Date.now();
  const card: Card = {
    id: createId(),
    deckId,
    ...data,
    dueAt: now,
    intervalDays: 0,
    reviewCount: 0,
    createdAt: now,
  };
  setState({ ...s, cards: [...s.cards, card] });
  return card;
}

export function updateCard(
  cardId: string,
  data: { front: string; back: string; example?: string | undefined },
) {
  const s = ensureState();
  setState({ ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...data } : c)) });
}

export function deleteCard(cardId: string) {
  const s = ensureState();
  setState({ ...s, cards: s.cards.filter((c) => c.id !== cardId) });
}

export function reviewCard(cardId: string, difficulty: Difficulty) {
  const s = ensureState();
  const days = {
    dificil: s.settings.dificilDays,
    medio: s.settings.medioDays,
    facil: s.settings.facilDays,
  }[difficulty];
  const now = Date.now();
  setState({
    ...s,
    cards: s.cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            dueAt: now + days * DAY_MS,
            intervalDays: days,
            reviewCount: c.reviewCount + 1,
            lastReviewedAt: now,
          }
        : c,
    ),
  });
}

export function updateSrsSettings(settings: SrsSettings) {
  const s = ensureState();
  setState({ ...s, settings });
}

export function getDeckCards(current: State, deckId: string) {
  return current.cards.filter((c) => c.deckId === deckId);
}

export function getDueCards(current: State, deckId: string, now = Date.now()) {
  return getDeckCards(current, deckId).filter((c) => c.dueAt <= now);
}

export function getVocabMasteryPct(current: State): number | null {
  const reviewed = current.cards.filter((c) => c.reviewCount > 0);
  if (reviewed.length === 0) return null;
  const mastered = reviewed.filter((c) => c.intervalDays === current.settings.facilDays);
  return Math.round((100 * mastered.length) / reviewed.length);
}

export function useFlashcardsStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
