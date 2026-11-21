import { useSyncExternalStore } from "react";
import type { Competency } from "./progress-store";
import { snoozeKey, type Snoozes } from "./study-plan-store";

/**
 * Caixa de notificações do mentor: tudo o que o app avisou (lembretes e perguntas sobre o plano)
 * fica aqui, para aparecer no banner, no sino da Home e na tela "Notificações" — mesmo quando o
 * navegador não deixa mostrar notificação do sistema (ex.: sem HTTPS). Guardada só no aparelho.
 */

export type InboxItem = {
  /** Também é a chave de deduplicação: o mesmo aviso nunca entra duas vezes. */
  id: string;
  kind: "lembrete" | "pergunta";
  title: string;
  body: string;
  at: number;
  read: boolean;
  /** Bloco a que o aviso se refere. */
  slotId: string;
  date: string;
  time: string;
  minutes: number;
  focus: Competency | null;
};

type State = { items: InboxItem[]; snoozes: Snoozes };

const STORAGE_KEY = "hi.inbox.v1";
const MAX_ITEMS = 50;
const MAX_SNOOZES = 30;

const EMPTY: State = { items: [], snoozes: {} };

function load(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return { items: parsed.items ?? [], snoozes: parsed.snoozes ?? {} };
  } catch {
    return EMPTY;
  }
}

let state: State | null = null;
/** Último item criado nesta sessão: o banner usa para saber o que acabou de chegar. */
let lastAddedId: string | null = null;
const listeners = new Set<() => void>();

function ensure(): State {
  if (state === null) state = load();
  return state;
}

function set(next: State) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sem armazenamento: segue em memória
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getInbox(): State {
  return ensure();
}

export function getLastAddedId() {
  return lastAddedId;
}

/** Adiciona o aviso, se ainda não existir. Devolve `true` quando era novo. */
export function addInboxItem(item: Omit<InboxItem, "read">): boolean {
  const s = ensure();
  if (s.items.some((i) => i.id === item.id)) return false;
  lastAddedId = item.id;
  set({ ...s, items: [{ ...item, read: false }, ...s.items].slice(0, MAX_ITEMS) });
  return true;
}

export function markRead(id: string) {
  const s = ensure();
  if (!s.items.some((i) => i.id === id && !i.read)) return;
  set({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) });
}

export function markAllRead() {
  const s = ensure();
  if (s.items.every((i) => i.read)) return;
  set({ ...s, items: s.items.map((i) => ({ ...i, read: true })) });
}

/** "Adiar 10 min": empurra o horário do bloco de hoje (o lembrete vem de novo no novo horário). */
export function snoozeSlot(date: string, slotId: string, minutes = 10) {
  const s = ensure();
  const key = snoozeKey(date, slotId);
  const entries = Object.entries({ ...s.snoozes, [key]: (s.snoozes[key] ?? 0) + minutes });
  set({ ...s, snoozes: Object.fromEntries(entries.slice(-MAX_SNOOZES)) });
}

export function unreadCount(items: InboxItem[]) {
  return items.filter((i) => !i.read).length;
}

export function useInbox() {
  return useSyncExternalStore(subscribe, ensure, () => EMPTY);
}
