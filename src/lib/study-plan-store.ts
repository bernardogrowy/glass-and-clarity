import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";
import { COMPETENCY_INFO, type Competency } from "./progress-store";

/**
 * CONTRATO DE ESTUDO — o aluno escreve um plano (objetivo, foco, rotina) e o mentor cobra esse plano.
 * A cobrança nasce do objetivo (prova, nota-alvo, curso), nunca da sequência de dias. Quando um
 * bloco não acontece, o app faz uma pergunta sobre o plano ("o horário ainda faz sentido?"), não
 * uma cobrança de culpa. Por isso aqui não existe nenhum texto sobre "perder a sequência".
 */

export type GoalKind = "prova" | "nota" | "curso" | "trabalho" | "outro";

export const GOAL_KIND_INFO: Record<
  GoalKind,
  { label: string; titleHint: string; targetHint: string }
> = {
  prova: {
    label: "Uma prova",
    titleHint: "Ex.: TOEFL, IELTS, Cambridge",
    targetHint: "Ex.: 90 pontos",
  },
  nota: {
    label: "Uma nota-alvo",
    titleHint: "Ex.: Prova de inglês da faculdade",
    targetHint: "Ex.: nota 8",
  },
  curso: {
    label: "Um curso desejado",
    titleHint: "Ex.: Mestrado em Dublin",
    targetHint: "Ex.: nível B2 comprovado",
  },
  trabalho: {
    label: "Uma vaga ou trabalho",
    titleHint: "Ex.: Vaga de analista na empresa X",
    targetHint: "Ex.: passar na entrevista em inglês",
  },
  outro: {
    label: "Outro objetivo",
    titleHint: "Qual é o seu objetivo?",
    targetHint: "Como você saberá que chegou lá?",
  },
};
export const GOAL_KIND_LIST = Object.keys(GOAL_KIND_INFO) as GoalKind[];

/** 0 = domingo … 6 = sábado (mesmo valor de `Date.getDay()`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const WEEKDAY_LONG = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;
/** Ordem de exibição: segunda → domingo. */
export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export type StudySlot = {
  id: string;
  weekday: Weekday;
  /** "HH:MM", horário local. */
  time: string;
  minutes: number;
};

/** O que a pessoa respondeu quando o mentor perguntou sobre um bloco que não aconteceu. */
export type CheckinOutcome = "imprevisto" | "adiado" | "horario" | "puxado";

export type Checkin = {
  /** yyyy-mm-dd do bloco que não aconteceu. */
  date: string;
  slotId: string;
  outcome: CheckinOutcome;
  at: number;
};

export type StudyPlan = {
  signed: boolean;
  signedAt: number | null;
  goal: { kind: GoalKind; title: string; target: string; deadline: string | null };
  focus: Competency[];
  slots: StudySlot[];
  commitment: string;
  /** Se o texto foi editado à mão, deixamos de reescrevê-lo quando o plano muda. */
  commitmentEdited: boolean;
  notifications: { enabled: boolean; leadMinutes: number };
  checkins: Checkin[];
};

const STORAGE_KEY = "hi.studyplan.v1";
const MAX_CHECKINS = 200;

export const SLOT_MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
export const LEAD_OPTIONS = [0, 10, 30] as const;

export function emptyPlan(): StudyPlan {
  return {
    signed: false,
    signedAt: null,
    goal: { kind: "prova", title: "", target: "", deadline: null },
    focus: [],
    slots: [],
    commitment: "",
    commitmentEdited: false,
    notifications: { enabled: false, leadMinutes: 10 },
    checkins: [],
  };
}

function normalize(parsed: Partial<StudyPlan> | null | undefined): StudyPlan {
  const base = emptyPlan();
  return {
    signed: parsed?.signed ?? base.signed,
    signedAt: parsed?.signedAt ?? base.signedAt,
    goal: { ...base.goal, ...parsed?.goal },
    focus: parsed?.focus ?? base.focus,
    slots: parsed?.slots ?? base.slots,
    commitment: parsed?.commitment ?? base.commitment,
    commitmentEdited: parsed?.commitmentEdited ?? base.commitmentEdited,
    notifications: { ...base.notifications, ...parsed?.notifications },
    checkins: parsed?.checkins ?? base.checkins,
  };
}

// ---------------------------------------------------------------------------------------------
// Datas e horários (funções puras — recebem `now` para serem testáveis)
// ---------------------------------------------------------------------------------------------

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function parseTime(time: string): { h: number; m: number } {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return { h: Math.min(23, Math.max(0, h)), m: Math.min(59, Math.max(0, m)) };
}

/** Momento exato (local) em que o bloco acontece no dia `day`. */
export function occurrenceAt(slot: StudySlot, day: Date): Date {
  const { h, m } = parseTime(slot.time);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}

export function slotsOnDay(plan: StudyPlan, day: Date): StudySlot[] {
  return plan.slots
    .filter((s) => s.weekday === day.getDay())
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Dias inteiros até o prazo (0 = é hoje, negativo = já passou). `null` sem prazo. */
export function daysUntil(deadline: string | null, now: Date): number | null {
  if (!deadline) return null;
  const [y = 0, m = 1, d = 1] = deadline.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Foco de cada bloco: gira pelas áreas escolhidas, na ordem semanal dos blocos. */
export function focusForSlot(plan: StudyPlan, slot: StudySlot): Competency | null {
  if (plan.focus.length === 0) return null;
  const ordered = [...plan.slots].sort(
    (a, b) =>
      WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday) ||
      a.time.localeCompare(b.time),
  );
  const index = ordered.findIndex((s) => s.id === slot.id);
  return plan.focus[Math.max(0, index) % plan.focus.length] ?? null;
}

export function focusLabel(plan: StudyPlan, slot: StudySlot): string {
  const focus = focusForSlot(plan, slot);
  return focus ? COMPETENCY_INFO[focus].label.toLowerCase() : "estudo livre";
}

function hasCheckin(plan: StudyPlan, date: string, slotId: string) {
  return plan.checkins.some((c) => c.date === date && c.slotId === slotId);
}

/** Frase do contrato, gerada a partir do que a pessoa escolheu. */
export function draftCommitment(plan: StudyPlan): string {
  const { goal, slots, focus } = plan;
  const parts: string[] = [];
  if (slots.length > 0) {
    const days = WEEKDAY_ORDER.filter((d) => slots.some((s) => s.weekday === d))
      .map((d) => WEEKDAY_LONG[d])
      .join(", ");
    const first = [...slots].sort((a, b) => a.time.localeCompare(b.time))[0]!;
    const minutes = Math.round(slots.reduce((sum, s) => sum + s.minutes, 0) / slots.length);
    parts.push(
      `Eu me comprometo a estudar inglês ${slots.length}x por semana (${days}), por volta das ${first.time}, ${minutes} min por vez`,
    );
  } else {
    parts.push("Eu me comprometo a estudar inglês com regularidade");
  }
  if (focus.length > 0) {
    parts.push(
      `com foco em ${focus.map((c) => COMPETENCY_INFO[c].label.toLowerCase()).join(", ")}`,
    );
  }
  let text = parts.join(", ");
  if (goal.title.trim()) {
    text += ` para ${goal.title.trim()}`;
    if (goal.target.trim()) text += ` (meta: ${goal.target.trim()})`;
    if (goal.deadline) text += ` até ${goal.deadline.split("-").reverse().join("/")}`;
  }
  return `${text}.`;
}

export function isPlanReady(plan: StudyPlan): boolean {
  return plan.goal.title.trim().length > 0 && plan.slots.length > 0;
}

// ---------------------------------------------------------------------------------------------
// Mentor: o que dizer agora, e o que perguntar quando um bloco não aconteceu
// ---------------------------------------------------------------------------------------------

export type MissedSlot = { date: string; slot: StudySlot; at: Date };

/**
 * Bloco recente que não aconteceu: passou do horário (hoje, só 3h depois), não houve estudo
 * nenhum naquele dia e a pessoa ainda não respondeu sobre ele. Olha os últimos 3 dias.
 */
export function findMissedSlot(
  plan: StudyPlan,
  activeDates: string[],
  now: Date,
): MissedSlot | null {
  if (!plan.signed || plan.signedAt === null) return null;
  for (let back = 0; back <= 3; back++) {
    const day = addDays(now, -back);
    const key = dayKey(day);
    if (activeDates.includes(key)) continue;
    const candidates = slotsOnDay(plan, day).reverse();
    for (const slot of candidates) {
      const at = occurrenceAt(slot, day);
      if (at.getTime() < plan.signedAt) continue;
      const graceMs = back === 0 ? 3 * 3_600_000 : 0;
      if (now.getTime() < at.getTime() + graceMs) continue;
      if (hasCheckin(plan, key, slot.id)) continue;
      return { date: key, slot, at };
    }
  }
  return null;
}

/** Próxima ocorrência de bloco a partir de `now` (inclusive hoje). */
/** Adiamentos ("Adiar 10 min"): minutos somados ao horário do bloco, por "yyyy-mm-dd:slotId". */
export type Snoozes = Record<string, number>;
export const snoozeKey = (date: string, slotId: string) => `${date}:${slotId}`;

/**
 * Próxima ocorrência de bloco a partir de `now` (inclusive hoje). `at` já considera o adiamento;
 * `originalAt` é o horário combinado no contrato.
 */
export function nextOccurrence(
  plan: StudyPlan,
  now: Date,
  snoozes: Snoozes = {},
): { slot: StudySlot; at: Date; originalAt: Date } | null {
  let best: { slot: StudySlot; at: Date; originalAt: Date } | null = null;
  for (let ahead = 0; ahead <= 7; ahead++) {
    const day = addDays(now, ahead);
    for (const slot of slotsOnDay(plan, day)) {
      const originalAt = occurrenceAt(slot, day);
      const delay = (snoozes[snoozeKey(dayKey(day), slot.id)] ?? 0) * 60_000;
      const at = new Date(originalAt.getTime() + delay);
      if (at.getTime() < now.getTime()) continue;
      if (!best || at.getTime() < best.at.getTime()) best = { slot, at, originalAt };
    }
    if (best) break;
  }
  return best;
}

/** Blocos da semana (segunda → domingo) até agora, e quantos tiveram estudo naquele dia. */
export function weekAdherence(plan: StudyPlan, activeDates: string[], now: Date) {
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = addDays(now, -mondayOffset);
  let planned = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    for (const slot of slotsOnDay(plan, day)) {
      if (occurrenceAt(slot, day).getTime() > now.getTime() && !activeDates.includes(dayKey(day)))
        continue;
      planned += 1;
      if (activeDates.includes(dayKey(day))) done += 1;
    }
  }
  return { planned, done, total: plan.slots.length };
}

/** Linha do objetivo — é daqui que vem a cobrança. */
export function goalLine(plan: StudyPlan, now: Date): string {
  const title = plan.goal.title.trim() || "seu objetivo";
  const left = daysUntil(plan.goal.deadline, now);
  const meta = plan.goal.target.trim() ? ` · meta: ${plan.goal.target.trim()}` : "";
  if (left === null) return `Rumo a ${title}${meta}`;
  if (left < 0) return `O prazo de ${title} passou — vale revisar o contrato${meta}`;
  if (left === 0) return `${title} é hoje${meta}`;
  return `Faltam ${left} dia${left === 1 ? "" : "s"} para ${title}${meta}`;
}

/** Quantas vezes o bloco escapou por motivo de plano (horário/duração/adiado) nas últimas 2 semanas. */
export function planMissesForSlot(plan: StudyPlan, slotId: string, now: Date): number {
  const since = now.getTime() - 14 * 86_400_000;
  return plan.checkins.filter(
    (c) => c.slotId === slotId && c.outcome !== "imprevisto" && c.at >= since,
  ).length;
}

export type MentorMessage = {
  kind: "pergunta" | "hoje" | "proximo" | "feito" | "convite";
  eyebrow: string;
  title: string;
  body: string;
  /** Presente em `pergunta`: o bloco sobre o qual o mentor está perguntando. */
  missed?: MissedSlot;
  /** Foco do bloco (em `hoje`/`proximo`): define a atividade que o botão "Começar" abre. */
  focus?: Competency | null;
  /** Em `hoje`/`proximo`: o bloco e quando ele começa (já com adiamento). */
  slot?: StudySlot;
  startsAt?: Date;
  /** Em `hoje`: minutos até começar (0 = agora). Só lembramos "em N min" quando falta pouco. */
  startsInMin?: number;
  /** Texto curto do selo, ex.: "ontem, 18h" (em `pergunta`). */
  when?: string;
};

/** "hoje, 19h" · "ontem, 18h30" · "terça, 19h" — como o mentor se refere a um bloco. */
export function describeBlockWhen(date: string, time: string, now: Date): string {
  const { h, m } = parseTime(time);
  const clock = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
  const [y = 0, mo = 1, d = 1] = date.split("-").map(Number);
  const day = new Date(y, mo - 1, d);
  if (date === dayKey(now)) return `hoje, ${clock}`;
  if (date === dayKey(addDays(now, -1))) return `ontem, ${clock}`;
  return `${WEEKDAY_LONG[day.getDay()]}, ${clock}`;
}

/** Minutos para o lembrete virar "Sua missão começa em N min" (antes disso mostramos o horário). */
export const NEAR_MINUTES = 60;

/**
 * Onde cada foco se pratica hoje no app. Vocabulário e gramática vivem nas lições da trilha;
 * o restante (conversa, escuta, pronúncia, fluência…) é treinado na conversa por voz.
 * Quando existirem módulos próprios (ex.: só escuta), é só mudar esta tabela.
 */
export type FocusDestination = "licao" | "pratica";
export const FOCUS_DESTINATION: Record<Competency, FocusDestination> = {
  vocabulario: "licao",
  gramatica: "licao",
  conversacao: "pratica",
  compreensao: "pratica",
  pronuncia: "pratica",
  fluencia: "pratica",
  confianca: "pratica",
  situacoes: "pratica",
};

export function focusDestination(focus: Competency | null | undefined): FocusDestination {
  return focus ? FOCUS_DESTINATION[focus] : "licao";
}

export function buildMentorMessage(
  plan: StudyPlan,
  activeDates: string[],
  now: Date,
  snoozes: Snoozes = {},
): MentorMessage {
  if (!plan.signed || !isPlanReady(plan)) {
    return {
      kind: "convite",
      eyebrow: "Contrato de estudo",
      title: "Escreva seu plano e eu cobro por ele",
      body: "Diga o que você quer alcançar, quando estuda e no que quer focar. Sem lembretes genéricos.",
    };
  }

  const missed = findMissedSlot(plan, activeDates, now);
  if (missed) {
    const repeated = planMissesForSlot(plan, missed.slot.id, now) >= 2;
    return {
      kind: "pergunta",
      eyebrow: "Sobre o seu plano",
      title: `Bloco perdido: ${focusLabel(plan, missed.slot)}`,
      body: repeated
        ? `Esse bloco tem escapado. Talvez o plano precise de ajuste. ${goalLine(plan, now)}.`
        : `O que aconteceu com esse bloco? ${goalLine(plan, now)}.`,
      missed,
      when: describeBlockWhen(missed.date, missed.slot.time, now),
      focus: focusForSlot(plan, missed.slot),
      slot: missed.slot,
    };
  }

  const todays = slotsOnDay(plan, now);
  const todayDone = activeDates.includes(dayKey(now));
  const week = weekAdherence(plan, activeDates, now);
  const weekLine =
    week.planned > 0 ? `Esta semana: ${week.done} de ${week.planned} blocos do plano.` : "";

  if (todays.length > 0 && todayDone) {
    return {
      kind: "feito",
      eyebrow: "Seu contrato",
      title: "Bloco de hoje cumprido",
      body: [goalLine(plan, now) + ".", weekLine].filter(Boolean).join(" "),
    };
  }

  const next = nextOccurrence(plan, now, snoozes);
  if (next) {
    const isToday = dayKey(next.at) === dayKey(now);
    const focus = focusLabel(plan, next.slot);
    const clock = `${String(next.at.getHours()).padStart(2, "0")}:${String(next.at.getMinutes()).padStart(2, "0")}`;
    const startsInMin = Math.max(0, Math.ceil((next.at.getTime() - now.getTime()) / 60_000));
    return {
      kind: isToday ? "hoje" : "proximo",
      focus: focusForSlot(plan, next.slot),
      slot: next.slot,
      startsAt: next.at,
      startsInMin,
      eyebrow: isToday ? "Hoje no seu contrato" : "Próximo bloco",
      title: isToday
        ? `Às ${clock} · ${next.slot.minutes} min de ${focus}`
        : `${WEEKDAY_LONG[next.slot.weekday]} às ${clock} · ${next.slot.minutes} min de ${focus}`,
      body: [goalLine(plan, now) + ".", weekLine].filter(Boolean).join(" "),
    };
  }

  return {
    kind: "proximo",
    eyebrow: "Seu contrato",
    title: "Sem blocos marcados",
    body: `${goalLine(plan, now)}. Adicione horários ao contrato para eu poder acompanhar.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Armazenamento
// ---------------------------------------------------------------------------------------------

const SERVER_SNAPSHOT: StudyPlan = emptyPlan();
let state: StudyPlan | null = null;
const listeners = new Set<() => void>();

function loadState(): StudyPlan {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPlan();
    return normalize(JSON.parse(raw) as Partial<StudyPlan>);
  } catch {
    return emptyPlan();
  }
}

function persist(next: StudyPlan) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // modo privado / armazenamento cheio — segue em memória nesta sessão
  }
}

function ensureState(): StudyPlan {
  if (state === null) state = loadState();
  return state;
}

function setState(next: StudyPlan) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStudyPlan(): StudyPlan {
  return ensureState();
}

/** Assina (ou atualiza) o contrato. Alterações no plano mantêm a data da 1ª assinatura. */
export function signPlan(draft: StudyPlan) {
  const current = ensureState();
  setState({
    ...draft,
    signed: true,
    signedAt: current.signedAt ?? Date.now(),
    checkins: current.checkins,
    notifications: draft.notifications,
  });
}

export function setNotificationsEnabled(enabled: boolean) {
  const s = ensureState();
  setState({ ...s, notifications: { ...s.notifications, enabled } });
}

/** Registra a resposta da pessoa sobre um bloco que não aconteceu. */
export function recordCheckin(date: string, slotId: string, outcome: CheckinOutcome) {
  const s = ensureState();
  const checkins = [
    ...s.checkins.filter((c) => !(c.date === date && c.slotId === slotId)),
    { date, slotId, outcome, at: Date.now() },
  ].slice(-MAX_CHECKINS);
  setState({ ...s, checkins });
}

/** Ajusta um bloco já existente (horário ou duração), mantendo o resto do contrato. */
export function updateSlot(slotId: string, patch: Partial<Pick<StudySlot, "time" | "minutes">>) {
  const s = ensureState();
  const slots = s.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot));
  const next = { ...s, slots };
  setState({
    ...next,
    commitment: next.commitmentEdited ? next.commitment : draftCommitment(next),
  });
}

/** Só para testes: volta ao estado vazio. */
export function resetStudyPlanForTests() {
  setState(emptyPlan());
}

/** Ligação com o Firestore (users/{uid}/data/studyPlan). Ver cloud-sync.ts. */
export const studyPlanCloudBinding: CloudBinding<StudyPlan> = {
  field: "studyPlan",
  empty: emptyPlan,
  get: ensureState,
  replace: (remote) => setState(normalize(remote)),
  subscribe,
};

export function useStudyPlan() {
  return useSyncExternalStore(subscribe, ensureState, () => SERVER_SNAPSHOT);
}
