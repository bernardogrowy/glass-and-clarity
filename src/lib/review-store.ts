import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";

/**
 * Revisão espaçada das palavras da trilha e dos cursos (entre unidades). Cada palavra aprendida
 * entra sozinha na agenda quando a atividade termina e volta depois de 1, 3, 7, 14 e 30 dias.
 * Acertou: sobe uma caixa (intervalo maior). Errou: volta para a primeira (amanhã).
 *
 * Este arquivo só guarda a agenda. Montar as perguntas é com `review-session.ts`.
 */

/** Dias até a próxima revisão, por caixa (0 = recém-aprendida ou errada). */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const LAST_BOX = REVIEW_INTERVAL_DAYS.length - 1;

export type ReviewItem = {
  /** Caixa atual (índice em `REVIEW_INTERVAL_DAYS`). */
  box: number;
  /** A partir de quando a palavra pode ser revisada. */
  dueAt: number;
  enrolledAt: number;
  lastReviewedAt?: number;
  reviews: number;
  /** Quantas vezes errou numa revisão. */
  lapses: number;
};

type State = {
  /** Por id da palavra (únicos em toda a trilha e nos cursos). */
  items: Record<string, ReviewItem>;
};

export type ReviewState = State;

const STORAGE_KEY = "hi.review.v1";

function emptyState(): State {
  return { items: {} };
}

function normalize(parsed: Partial<State> | null | undefined): State {
  return { items: parsed?.items ?? {} };
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
    // modo privado / armazenamento cheio: segue só em memória nesta sessão
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

/** Meia-noite local de `days` dias depois de `now`: a revisão fica disponível desde de manhã. */
export function dueDay(now: number, days: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

/**
 * Põe as palavras na agenda, para a primeira revisão no dia seguinte. Quem já está na agenda
 * não muda (refazer uma atividade não zera o progresso da palavra).
 */
export function enrollWords(wordIds: readonly string[], now: number = Date.now()) {
  const s = ensureState();
  const fresh = wordIds.filter((id) => !s.items[id]);
  if (fresh.length === 0) return;
  const items = { ...s.items };
  for (const id of fresh) {
    items[id] = {
      box: 0,
      dueAt: dueDay(now, REVIEW_INTERVAL_DAYS[0]),
      enrolledAt: now,
      reviews: 0,
      lapses: 0,
    };
  }
  setState({ items });
}

/**
 * Registra o resultado de uma revisão. Acerto: caixa +1 (até a última) e próxima data pelo novo
 * intervalo. Erro: volta à caixa 0 e à revisão de amanhã. Palavra fora da agenda é ignorada.
 */
export function answerReview(wordId: string, correct: boolean, now: number = Date.now()) {
  const s = ensureState();
  const item = s.items[wordId];
  if (!item) return;
  const box = correct ? Math.min(item.box + 1, LAST_BOX) : 0;
  setState({
    items: {
      ...s.items,
      [wordId]: {
        ...item,
        box,
        dueAt: dueDay(now, REVIEW_INTERVAL_DAYS[box] ?? REVIEW_INTERVAL_DAYS[0]),
        lastReviewedAt: now,
        reviews: item.reviews + 1,
        lapses: item.lapses + (correct ? 0 : 1),
      },
    },
  });
}

/** Ids das palavras que já podem ser revisadas, da mais atrasada para a mais recente. */
export function getDueWordIds(current: State, now: number): string[] {
  return Object.entries(current.items)
    .filter(([, item]) => item.dueAt <= now)
    .sort((a, b) => a[1].dueAt - b[1].dueAt)
    .map(([id]) => id);
}

/** Quantas palavras estão na agenda e quantas já chegaram na última caixa (bem fixadas). */
export function getReviewTotals(current: State) {
  const items = Object.values(current.items);
  return { total: items.length, mastered: items.filter((i) => i.box >= LAST_BOX).length };
}

/** Ligação com o Firestore (users/{uid}/data/review). Ver cloud-sync.ts. */
export const reviewCloudBinding: CloudBinding<State> = {
  field: "review",
  empty: emptyState,
  get: ensureState,
  replace: (remote) => setState(normalize(remote)),
  subscribe,
};

export function useReviewStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
