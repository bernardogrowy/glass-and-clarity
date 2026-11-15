import { Check, Lock, RotateCcw } from "lucide-react";
import { forwardRef } from "react";
import { SKILLS, type Activity } from "@/lib/trail";
import type { ActivityStatus } from "@/lib/trail-store";
import { cn } from "@/lib/utils";

type PathNodeProps = {
  activity: Activity;
  status: ActivityStatus;
  /** Palavras dessa atividade com revisão vencida (selo ↻ "Revisar hoje"). */
  needsReview: boolean;
  /** Concluída agora há pouco: faz a animação de "concluir". */
  justCompleted: boolean;
  x: number;
  y: number;
  onPress: () => void;
};

function statusText(status: ActivityStatus, minutes: number, needsReview: boolean) {
  if (status === "concluida") return needsReview ? "Revisar hoje" : "Concluída";
  if (status === "atual") return `Disponível · ${minutes} min`;
  return "Bloqueada";
}

function statusSpoken(status: ActivityStatus, minutes: number, needsReview: boolean) {
  if (status === "concluida") return needsReview ? "concluída, revisar hoje" : "concluída";
  if (status === "atual") return `disponível, ${minutes} minutos`;
  return "bloqueada";
}

/**
 * Um nó da trilha. O estado se distingue por forma, ícone e texto — nunca só por cor:
 * concluída (cor da habilidade + selo ✓), atual (maior, escuro, anel teal, tag COMEÇAR),
 * bloqueada (tracejada + cadeado) e checkpoint (quadrado arredondado + bandeira).
 */
export const PathNode = forwardRef<HTMLButtonElement, PathNodeProps>(function PathNode(
  { activity, status, needsReview, justCompleted, x, y, onPress },
  ref,
) {
  const skill = SKILLS[activity.skill];
  const Icon = skill.icon;
  const isCheckpoint = activity.skill === "checkpoint";
  const isCurrent = status === "atual";
  const isLocked = status === "bloqueada";
  const isDone = status === "concluida";
  const size = isCurrent ? 88 : 76;
  const shape = isCheckpoint ? "rounded-[1.6rem]" : "rounded-full";

  return (
    <div
      className="absolute flex w-40 -translate-x-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: y }}
    >
      <div className="relative" style={{ height: 88, width: 88 }}>
        {isCurrent && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -inset-2 bg-accent/45 motion-safe:animate-pulse",
              isCheckpoint ? "rounded-[2rem]" : "rounded-full",
            )}
          />
        )}
        {isCurrent && (
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-[11px] font-bold tracking-wider shadow-[var(--shadow-card)]">
            COMEÇAR
          </span>
        )}
        <button
          ref={ref}
          type="button"
          onClick={onPress}
          aria-label={`${skill.label}, ${statusSpoken(status, activity.minutes, needsReview)}`}
          className={cn(
            "press absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center",
            "motion-reduce:transition-none",
            shape,
            isDone && cn(skill.tone, "border-[3px] border-white shadow-[var(--shadow-card)]"),
            isDone &&
              justCompleted &&
              "animate-in zoom-in-95 duration-200 motion-reduce:animate-none",
            isCurrent && "glass-dark border-[3px] border-white",
            isLocked && "border-2 border-dashed border-foreground/35 bg-card/60",
          )}
          style={{ height: size, width: size }}
        >
          {isLocked ? (
            <Lock className="h-6 w-6 text-foreground/70" />
          ) : (
            <Icon className="h-7 w-7" />
          )}
        </button>
        {isDone && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white text-white",
              needsReview ? "bg-butter text-foreground" : "bg-emerald-800",
              justCompleted && "animate-in zoom-in duration-200 motion-reduce:animate-none",
            )}
          >
            {needsReview ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
          </span>
        )}
      </div>
      <div className="mt-1 rounded-2xl bg-background/60 px-3 py-1 text-center backdrop-blur-sm">
        <p className="text-[15px] font-semibold leading-tight">{skill.label}</p>
        <p className="text-xs leading-tight text-muted-foreground">
          {statusText(status, activity.minutes, needsReview)}
        </p>
      </div>
    </div>
  );
});

/**
 * Linha que liga os nós: sólida e teal quando o trecho já foi percorrido, pontilhada no que falta.
 * Desenhada em um viewBox de largura 100 (esticado na largura do container) e altura em px.
 */
export function PathConnectors({
  points,
  doneUntil,
  height,
}: {
  points: { x: number; y: number }[];
  /** Quantos nós, contados do início, estão concluídos (o trecho que sai deles fica sólido). */
  doneUntil: number;
  height: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      {points.slice(0, -1).map((from, i) => {
        const to = points[i + 1]!;
        const solid = i < doneUntil;
        const mid = (to.y - from.y) / 2;
        return (
          <path
            key={i}
            d={`M ${from.x} ${from.y} C ${from.x} ${from.y + mid}, ${to.x} ${to.y - mid}, ${to.x} ${to.y}`}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeWidth={solid ? 5 : 4}
            strokeDasharray={solid ? undefined : "1 11"}
            className={solid ? "stroke-teal-700" : "stroke-foreground/25"}
          />
        );
      })}
    </svg>
  );
}
