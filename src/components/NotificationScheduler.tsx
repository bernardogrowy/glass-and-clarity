import { useEffect } from "react";
import { addInboxItem, getInbox } from "@/lib/notifications-store";
import {
  computeDueNotifications,
  deliver,
  registerNotificationWorker,
} from "@/lib/smart-notifications";
import { useStreakStore } from "@/lib/streak-store";
import { useStudyPlan } from "@/lib/study-plan-store";

const CHECK_EVERY_MS = 30_000;

/**
 * Confere de tempos em tempos se há algo do contrato para avisar e põe na caixa de notificações
 * (de onde saem o banner, o sino da Home e a tela "Notificações"). Se a aba estiver em segundo
 * plano e o navegador permitir, também manda a notificação do sistema.
 * Só roda com o app aberto (aba ou PWA); com o app fechado é preciso push do servidor.
 * Usa as datas com estudo só para saber se o bloco do dia já aconteceu, não para contar sequência.
 */
export function NotificationScheduler() {
  const plan = useStudyPlan();
  const streak = useStreakStore();
  const enabled = plan.signed && plan.notifications.enabled;

  useEffect(() => {
    if (!enabled) return;
    void registerNotificationWorker();

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const inbox = getInbox();
      const known = new Set(inbox.items.map((i) => i.id));
      const due = computeDueNotifications(
        plan,
        streak.activeDates,
        new Date(),
        known,
        inbox.snoozes,
      );
      for (const item of due) {
        const { push, ...entry } = item;
        const added = addInboxItem(entry);
        // Com o app na tela o banner interno cuida do aviso; o do sistema é para quem não está olhando.
        if (added && push && document.visibilityState === "hidden") void deliver(item);
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, plan, streak.activeDates]);

  return null;
}
