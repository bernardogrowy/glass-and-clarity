import { Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/trail/BottomSheet";
import { getLesson } from "@/lib/lessons";
import { SKILLS, type Activity, type Unit } from "@/lib/trail";
import type { ActivityStatus } from "@/lib/trail-store";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Record<ActivityStatus, { label: string; tone: string }> = {
  atual: { label: "Disponível", tone: "bg-mint" },
  concluida: { label: "Concluída", tone: "bg-mint" },
  bloqueada: { label: "Bloqueada", tone: "bg-muted" },
};

/** Cartão da lição: objetivos, palavras que voltam e o botão pra começar, refazer ou continuar. */
export function LessonSheet({
  open,
  onOpenChange,
  activity,
  unit,
  status,
  resumeStep,
  otherInProgress,
  bestAccuracy,
  reviewDeckId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  unit: Unit | null;
  status: ActivityStatus;
  /** Etapa (1-based) em que a pessoa parou, se esta lição estiver em andamento. */
  resumeStep: { current: number; total: number } | null;
  /** Há uma lição de outra atividade em andamento (começar esta reinicia aquela). */
  otherInProgress: boolean;
  bestAccuracy: number | null;
  /** Baralho com palavras desta atividade pra revisar hoje, se houver. */
  reviewDeckId: string | null;
}) {
  const skill = activity ? SKILLS[activity.skill] : null;
  const words = activity ? (getLesson(activity.lessonId)?.words ?? []) : [];
  const done = status === "concluida";
  const chip = STATUS_CHIP[status];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={activity ? `${skill?.label}: ${activity.title}` : "Atividade"}
    >
      {activity && skill && unit && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8 pt-5">
          <div className="flex flex-wrap gap-2">
            <span className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", skill.tone)}>
              {skill.label}
            </span>
            <span className="rounded-full bg-sky/50 px-4 py-1.5 text-sm font-semibold">
              {activity.minutes} min
            </span>
            <span className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", chip.tone)}>
              {chip.label}
            </span>
          </div>

          <h2 className="mt-4 font-display text-[2rem] leading-[1.1]">{activity.title}</h2>
          <p className="mt-2 text-muted-foreground">
            {done
              ? `Você já concluiu${bestAccuracy !== null ? ` · melhor acerto ${bestAccuracy}%` : ""}. Refaça quando quiser reforçar.`
              : "Veja os objetivos e continue seu aprendizado."}
          </p>

          <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ao final você vai
          </h3>
          <ol className="mt-3 space-y-3">
            {activity.objectives.map((objective, i) => (
              <li key={objective} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-butter text-sm font-semibold">
                  {i + 1}
                </span>
                <span className="leading-snug">{objective}</span>
              </li>
            ))}
          </ol>

          {words.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {activity.skill === "entrada" ||
                activity.skill === "aplicar" ||
                activity.skill === "falar"
                  ? "Itens desta etapa"
                  : "Itens que voltam"}
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {words.map((w) => (
                  <li key={w.id} className={cn("rounded-full px-4 py-2 font-semibold", w.tone)}>
                    {w.en}
                  </li>
                ))}
              </ul>
            </>
          )}

          {otherInProgress && !resumeStep && (
            <p className="mt-5 rounded-2xl bg-peach/40 p-3 text-sm leading-snug">
              Você tem outra lição em andamento. Começar esta reinicia aquela, mas as palavras que
              você já aprendeu continuam salvas.
            </p>
          )}

          <div className="mt-7 space-y-3">
            <Link
              to="/licao/$id"
              params={{ id: activity.lessonId }}
              onClick={() => onOpenChange(false)}
              className="glass-dark press flex h-14 items-center justify-center gap-2 rounded-full font-medium"
            >
              {resumeStep
                ? `Continuar lição · ${resumeStep.current}/${resumeStep.total}`
                : done
                  ? "Refazer"
                  : "Começar lição"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {reviewDeckId && (
              <Link
                to="/flashcards/$deckId"
                params={{ deckId: reviewDeckId }}
                className="glass press flex h-14 items-center justify-center gap-2 rounded-full font-medium"
              >
                <RotateCcw className="h-4 w-4" /> Revisar palavras fracas
              </Link>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
