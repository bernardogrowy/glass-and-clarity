import { useSyncExternalStore } from "react";

export type Competency =
  | "conversacao"
  | "compreensao"
  | "vocabulario"
  | "pronuncia"
  | "gramatica"
  | "fluencia"
  | "confianca"
  | "situacoes";

export type Step = { id: string; label: string; done: boolean };

export type Goal = {
  id: string;
  objetivo: string;
  situacao: string;
  prazo: string; // ISO date
  frequenciaPorSemana: number;
  tempoDisponivel: 5 | 10 | 15 | 21 | 30;
  competencias: Competency[];
  confiancaAtual: 1 | 2 | 3 | 4 | 5;
  steps: Step[];
  createdAt: number;
};

export type PracticeSession = {
  id: string;
  missionTitle: string;
  minutes: number;
  completedAt: number;
};

type State = { goals: Goal[]; sessions: PracticeSession[] };

export const COMPETENCY_INFO: Record<
  Competency,
  { label: string; low: string; mid: string; high: string }
> = {
  conversacao: {
    label: "Conversação",
    low: "Você ainda se apoia em frases decoradas — tente responder sem roteiro.",
    mid: "Já mantém um diálogo curto sem travar, mas hesita em perguntas inesperadas.",
    high: "Consegue sustentar uma conversa real, incluindo imprevistos e mudanças de assunto.",
  },
  compreensao: {
    label: "Compreensão auditiva",
    low: "Entende frases isoladas, mas se perde em falas corridas.",
    mid: "Acompanha conversas em ritmo normal, com dificuldade em sotaques diferentes.",
    high: "Entende conversas naturais, incluindo gírias e sotaques variados.",
  },
  vocabulario: {
    label: "Vocabulário",
    low: "Conhece o básico do dia a dia, mas ainda faltam termos específicos.",
    mid: "Já tem repertório pra situações comuns, mas trava em temas específicos.",
    high: "Vocabulário amplo o suficiente pra se virar na maioria das situações.",
  },
  pronuncia: {
    label: "Pronúncia",
    low: "Palavras isoladas ainda saem com o padrão de pronúncia do português.",
    mid: 'Você já consegue ser compreendido em frases curtas, mas ainda precisa praticar ritmo e palavras terminadas em "-ed".',
    high: "Sua pronúncia já soa natural na maior parte das frases.",
  },
  gramatica: {
    label: "Gramática aplicada",
    low: "Ainda troca tempos verbais e ordem das palavras com frequência.",
    mid: "Frases simples saem certas, estruturas mais longas ainda têm erros.",
    high: "Já constrói frases complexas com poucos erros perceptíveis.",
  },
  fluencia: {
    label: "Fluência",
    low: "Fala com pausas longas enquanto busca as palavras.",
    mid: "Não trava em frases curtas, mas perde o ritmo em respostas mais longas.",
    high: "Fala em ritmo natural, sem pausas que atrapalhem o entendimento.",
  },
  confianca: {
    label: "Confiança",
    low: "Ainda evita falar por medo de errar.",
    mid: "Já arrisca falar mesmo sem certeza, mas fica desconfortável em público.",
    high: "Fala sem se preocupar em errar — o foco já é se comunicar.",
  },
  situacoes: {
    label: "Situações profissionais e sociais",
    low: "Ainda não testou o idioma numa situação parecida com a meta.",
    mid: "Já simulou a situação, falta testar no mundo real.",
    high: "Já usou o idioma de verdade nessa situação, não só em simulação.",
  },
};

export const COMPETENCY_LIST = Object.keys(COMPETENCY_INFO) as Competency[];

const STORAGE_KEY = "hi.progress.v1";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyState(): State {
  return { goals: [], sessions: [] };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return { goals: parsed.goals ?? [], sessions: parsed.sessions ?? [] };
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

function generateSteps(data: {
  prazo: string;
  frequenciaPorSemana: number;
  competencias: Competency[];
  situacao: string;
}): Step[] {
  const now = new Date();
  const deadline = new Date(data.prazo);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const rawWeeks = Math.ceil((deadline.getTime() - now.getTime()) / msPerWeek);
  const weeks = Math.min(6, Math.max(1, rawWeeks || 1));
  const comps =
    data.competencias.length > 0 ? data.competencias : (["conversacao"] as Competency[]);

  const steps: Step[] = [];
  for (let week = 1; week <= weeks; week++) {
    const comp = comps[(week - 1) % comps.length] ?? "conversacao";
    steps.push({
      id: createId(),
      label: `Semana ${week} — pratique ${data.frequenciaPorSemana}x focando em ${COMPETENCY_INFO[comp].label.toLowerCase()}`,
      done: false,
    });
  }
  steps.push({ id: createId(), label: `Check-in final — ${data.situacao}`, done: false });
  return steps;
}

export function previewSteps(data: {
  prazo: string;
  frequenciaPorSemana: number;
  competencias: Competency[];
  situacao: string;
}): Step[] {
  return generateSteps(data);
}

export function createGoal(data: {
  objetivo: string;
  situacao: string;
  prazo: string;
  frequenciaPorSemana: number;
  tempoDisponivel: 5 | 10 | 15 | 21 | 30;
  competencias: Competency[];
  confiancaAtual: 1 | 2 | 3 | 4 | 5;
}): Goal {
  const s = ensureState();
  const goal: Goal = { id: createId(), ...data, steps: generateSteps(data), createdAt: Date.now() };
  setState({ ...s, goals: [...s.goals, goal] });
  return goal;
}

export function toggleStep(goalId: string, stepId: string) {
  const s = ensureState();
  setState({
    ...s,
    goals: s.goals.map((g) =>
      g.id === goalId
        ? { ...g, steps: g.steps.map((st) => (st.id === stepId ? { ...st, done: !st.done } : st)) }
        : g,
    ),
  });
}

export function deleteGoal(goalId: string) {
  const s = ensureState();
  setState({ ...s, goals: s.goals.filter((g) => g.id !== goalId) });
}

export function completeSession(data: { missionTitle: string; minutes: number }): PracticeSession {
  const s = ensureState();
  const session: PracticeSession = { id: createId(), ...data, completedAt: Date.now() };
  setState({ ...s, sessions: [...s.sessions, session] });
  return session;
}

export function getWeekRange(now: Date) {
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { start: monday.getTime(), end: nextMonday.getTime() };
}

export function getSessionsThisWeek(current: State, now = new Date()) {
  const { start, end } = getWeekRange(now);
  return current.sessions.filter((s) => s.completedAt >= start && s.completedAt < end);
}

export function getMinutesThisWeek(current: State, now = new Date()) {
  return getSessionsThisWeek(current, now).reduce((sum, s) => sum + s.minutes, 0);
}

export function getPracticedDatesThisWeek(current: State, now = new Date()) {
  return getSessionsThisWeek(current, now).map((s) => new Date(s.completedAt));
}

export function getGoalProgress(goal: Goal) {
  const base = goal.confiancaAtual * 20;
  if (goal.steps.length === 0) return base;
  const doneRatio = goal.steps.filter((s) => s.done).length / goal.steps.length;
  return Math.round(base + doneRatio * (100 - base));
}

export function getCompetencyScore(
  competency: Competency,
  current: State,
  vocabMasteryPct: number | null,
): number | null {
  const relatedGoals = current.goals.filter((g) => g.competencias.includes(competency));
  const scores = relatedGoals.map(getGoalProgress);
  if (competency === "vocabulario" && vocabMasteryPct !== null) scores.push(vocabMasteryPct);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getCompetencyTier(score: number): "low" | "mid" | "high" {
  if (score < 40) return "low";
  if (score < 75) return "mid";
  return "high";
}

export function useProgressStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
