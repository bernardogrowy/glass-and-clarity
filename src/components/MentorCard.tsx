import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Settings2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { MissedBlockSheet, type MissedTarget } from "@/components/MissedBlockSheet";
import { getLesson } from "@/lib/lessons";
import { snoozeSlot, useInbox } from "@/lib/notifications-store";
import { useProfileStore } from "@/lib/profile-store";
import { COMPETENCY_INFO, type Competency } from "@/lib/progress-store";
import { useStreakStore } from "@/lib/streak-store";
import {
  NEAR_MINUTES,
  buildMentorMessage,
  dayKey,
  focusDestination,
  useStudyPlan,
} from "@/lib/study-plan-store";
import { getCurrent, useTrailStore } from "@/lib/trail-store";
import { cn } from "@/lib/utils";

const primaryClass =
  "glass-dark press flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium";

/**
 * Botão que abre direto a atividade do foco do bloco: a lição atual da trilha (vocabulário e
 * gramática) ou a conversa por voz (os demais focos). Se a trilha acabou, volta para ela.
 */
export function StartFocusButton({
  focus,
  className,
  onClick,
  children = "Começar agora",
}: {
  focus: Competency | null | undefined;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const trail = useTrailStore();
  const { level } = useProfileStore();
  const lessonId = getCurrent(trail, level)?.activity.lessonId;
  const content = (
    <>
      {children} <ArrowRight className="h-4 w-4" />
    </>
  );

  if (focusDestination(focus) === "pratica") {
    return (
      <Link to="/pratica" className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }
  if (lessonId && getLesson(lessonId)) {
    return (
      <Link to="/licao/$id" params={{ id: lessonId }} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <Link to="/trilha" className={className} onClick={onClick}>
      {content}
    </Link>
  );
}

/**
 * O mentor na tela inicial. Fala do plano e do objetivo — nunca de sequência. Perto do horário
 * vira "Sua missão começa em N min" (com "Adiar 10 min"); se um bloco não aconteceu, faz uma
 * pergunta sobre o plano numa folha, sem culpa.
 */
export function MentorCard() {
  const plan = useStudyPlan();
  const streak = useStreakStore();
  const inbox = useInbox();
  // O relógio só existe no cliente; evita divergência na hidratação.
  const [now, setNow] = useState<Date | null>(null);
  const [target, setTarget] = useState<MissedTarget | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;
  const message = buildMentorMessage(plan, streak.activeDates, now, inbox.snoozes);

  if (message.kind === "convite") {
    return (
      <Link to="/plano" className="surface press mt-6 flex items-center gap-4 rounded-3xl p-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint">
          <Compass className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-teal-800">
            {message.eyebrow}
          </span>
          <span className="mt-0.5 block font-display text-lg leading-snug">{message.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{message.body}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    );
  }

  const near =
    message.kind === "hoje" &&
    message.startsInMin !== undefined &&
    message.startsInMin <= NEAR_MINUTES;
  const left = message.startsInMin ?? 0;
  const focusName = message.focus ? COMPETENCY_INFO[message.focus].label : "Estudo livre";

  const chip =
    message.kind === "pergunta"
      ? `Mentor · ${message.when}`
      : near
        ? "Mentor · agora"
        : message.kind === "proximo"
          ? "Mentor · próximo bloco"
          : "Mentor · hoje";
  const title = near
    ? left > 0
      ? `Sua missão começa em ${left} min`
      : "Sua missão começa agora"
    : message.title;
  const body = near
    ? `${focusName} · ${message.slot?.minutes ?? ""} min. Eu fico de olho.`
    : message.body;

  return (
    <article className="surface mt-6 rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            message.kind === "pergunta" ? "bg-peach" : "bg-butter",
          )}
        >
          {chip}
        </span>
        {near ? (
          <span className="text-xs text-muted-foreground">
            {left > 0 ? `em ${left} min` : "agora"}
          </span>
        ) : (
          <Link
            to="/plano"
            aria-label="Editar contrato de estudo"
            className="glass press grid h-9 w-9 place-items-center rounded-full"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        )}
      </div>
      <h2 className="mt-4 font-display text-[1.7rem] leading-snug">{title}</h2>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{body}</p>

      {message.kind === "pergunta" && message.missed && (
        <button
          type="button"
          className={cn(primaryClass, "mt-5 w-full")}
          onClick={() => setTarget({ date: message.missed!.date, slotId: message.missed!.slot.id })}
        >
          Responder <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {(message.kind === "hoje" || message.kind === "proximo") && (
        <div className="mt-5 flex gap-3">
          <StartFocusButton
            focus={message.focus}
            className={cn(primaryClass, near ? "flex-1" : "w-full")}
          />
          {near && message.slot && (
            <button
              type="button"
              className="glass press h-12 flex-1 rounded-full text-sm font-medium"
              onClick={() => {
                snoozeSlot(dayKey(now), message.slot!.id, 10);
                toast("Combinado: te aviso daqui a 10 min.");
              }}
            >
              Adiar 10 min
            </button>
          )}
        </div>
      )}

      <MissedBlockSheet target={target} onClose={() => setTarget(null)} />
    </article>
  );
}
