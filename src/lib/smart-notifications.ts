import type { Competency } from "./progress-store";
import {
  dayKey,
  focusForSlot,
  focusLabel,
  goalLine,
  occurrenceAt,
  slotsOnDay,
  snoozeKey,
  type Snoozes,
  type StudyPlan,
} from "./study-plan-store";

/**
 * Notificações inteligentes: nascem do contrato de estudo, não de um relógio genérico.
 *  - "lembrete": pouco antes do bloco ("Sua missão começa em 10 min"), citando o objetivo;
 *  - "pergunta": se o bloco não aconteceu, uma pergunta sobre o plano — nunca culpa nem sequência.
 * `computeDueNotifications` é pura (recebe `now`); o envio de fato fica em `deliver`.
 */

export type DueNotification = {
  /** Chave única (tipo + dia + bloco) para nunca avisar duas vezes. É também o id na caixa de entrada. */
  id: string;
  kind: "lembrete" | "pergunta";
  title: string;
  body: string;
  at: number;
  slotId: string;
  /** yyyy-mm-dd do bloco a que o aviso se refere. */
  date: string;
  time: string;
  minutes: number;
  focus: Competency | null;
  /** Vale também como notificação do sistema? (avisos antigos entram só na caixa de entrada.) */
  push: boolean;
};

/** Janela em que um lembrete ainda faz sentido depois do horário (ex.: o app foi aberto atrasado). */
const REMINDER_WINDOW_AFTER_MS = 30 * 60_000;
/** A pergunta sobre o plano só vem 90 min depois do horário. */
const QUESTION_AFTER_MS = 90 * 60_000;
/** Como notificação do sistema, a pergunta vale até 6h depois; depois disso só fica na caixa. */
const QUESTION_PUSH_UNTIL_MS = 6 * 3_600_000;
/** Blocos perdidos dos últimos dias (hoje + 3) entram na caixa de entrada. */
const QUESTION_LOOKBACK_DAYS = 3;

const capitalize = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export function computeDueNotifications(
  plan: StudyPlan,
  activeDates: string[],
  now: Date,
  alreadySent: ReadonlySet<string>,
  snoozes: Snoozes = {},
): DueNotification[] {
  if (!plan.signed || !plan.notifications.enabled || plan.signedAt === null) return [];
  const out: DueNotification[] = [];
  const lead = plan.notifications.leadMinutes * 60_000;
  const today = dayKey(now);

  // Lembretes: só os blocos de hoje, no horário combinado (mais o adiamento, se houve).
  if (!activeDates.includes(today)) {
    for (const slot of slotsOnDay(plan, now)) {
      const delayMin = snoozes[snoozeKey(today, slot.id)] ?? 0;
      const at = occurrenceAt(slot, now).getTime() + delayMin * 60_000;
      const elapsed = now.getTime() - at;
      const id = `lembrete:${today}:${slot.id}${delayMin > 0 ? `:s${delayMin}` : ""}`;
      if (alreadySent.has(id) || elapsed < -lead || elapsed > REMINDER_WINDOW_AFTER_MS) continue;
      const left = Math.ceil(-elapsed / 60_000);
      out.push({
        id,
        kind: "lembrete",
        title: left > 0 ? `Sua missão começa em ${left} min` : "Sua missão começa agora",
        body: `${capitalize(focusLabel(plan, slot))} · ${slot.minutes} min. ${goalLine(plan, now)}. Eu fico de olho.`,
        at: now.getTime(),
        slotId: slot.id,
        date: today,
        time: slot.time,
        minutes: slot.minutes,
        focus: focusForSlot(plan, slot),
        push: true,
      });
    }
  }

  // Perguntas: blocos de hoje e dos últimos dias que não aconteceram e ainda não foram respondidos.
  for (let back = 0; back <= QUESTION_LOOKBACK_DAYS; back++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
    const key = dayKey(day);
    if (activeDates.includes(key)) continue;
    for (const slot of slotsOnDay(plan, day)) {
      const blockAt = occurrenceAt(slot, day).getTime();
      if (blockAt < plan.signedAt) continue;
      const elapsed = now.getTime() - blockAt;
      const id = `pergunta:${key}:${slot.id}`;
      const answered = plan.checkins.some((c) => c.date === key && c.slotId === slot.id);
      if (answered || alreadySent.has(id) || elapsed < QUESTION_AFTER_MS) continue;
      out.push({
        id,
        kind: "pergunta",
        title: `Bloco perdido: ${focusLabel(plan, slot)}`,
        body: "O que aconteceu com esse bloco? Sem pressão — sua resposta só ajusta o plano.",
        at: blockAt + QUESTION_AFTER_MS,
        slotId: slot.id,
        date: key,
        time: slot.time,
        minutes: slot.minutes,
        focus: focusForSlot(plan, slot),
        push: elapsed <= QUESTION_PUSH_UNTIL_MS,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Suporte do navegador e envio
// ---------------------------------------------------------------------------------------------

export type NotificationSupport = "ok" | "insecure" | "unsupported";

/** Notificações do sistema exigem HTTPS (ou localhost). Pelo IP da rede (http://192.168…) não existem. */
export function getNotificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return "ok";
}

export function getPermission(): NotificationPermission | "unsupported" {
  return getNotificationSupport() === "ok" ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (getNotificationSupport() !== "ok") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function registerNotificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!window.isSecureContext) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** Mostra a notificação do sistema. No Android o Chrome só aceita via service worker, por isso tentamos ele antes. */
export async function deliver(notification: DueNotification): Promise<boolean> {
  if (getPermission() !== "granted") return false;
  const options: NotificationOptions = {
    body: notification.body,
    tag: notification.id,
    icon: "/favicon.ico",
    data: { url: "/notificacoes" },
  };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(notification.title, options);
      return true;
    }
    new Notification(notification.title, options);
    return true;
  } catch {
    return false;
  }
}
