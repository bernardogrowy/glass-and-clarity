import { Check, Lock, RotateCcw } from "lucide-react";
import { forwardRef, type CSSProperties } from "react";
import { MascotAvatar } from "@/components/MascotAvatar";
import { useProfileStore } from "@/lib/profile-store";
import { SKILLS, type Activity, type SkillId } from "@/lib/trail";
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

/** Cor da face e da base (a "espessura" 3D) de cada habilidade quando concluída. */
const DONE_COLORS: Record<SkillId, { face: string; edge: string }> = {
  descobrir: { face: "oklch(0.83 0.15 85)", edge: "oklch(0.62 0.14 75)" },
  reconhecer: { face: "oklch(0.78 0.12 235)", edge: "oklch(0.55 0.13 245)" },
  recordar: { face: "oklch(0.76 0.13 295)", edge: "oklch(0.53 0.15 295)" },
  aplicar: { face: "oklch(0.79 0.14 45)", edge: "oklch(0.58 0.16 40)" },
  checkpoint: { face: "oklch(0.85 0.16 92)", edge: "oklch(0.64 0.15 80)" },
};
const CURRENT_COLORS = { face: "oklch(0.74 0.15 165)", edge: "oklch(0.5 0.12 170)" };
const LOCKED_COLORS = { face: "oklch(0.87 0.012 215)", edge: "oklch(0.74 0.02 222)" };

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

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

/** A Hi torcendo ao lado do nó atual (do lado com mais espaço). Decorativa. */
function CheeringMascot({ side }: { side: "left" | "right" }) {
  const profile = useProfileStore();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "anim-mascot-cheer pointer-events-none absolute top-1/2 -translate-y-1/2",
        side === "right" ? "left-[calc(100%+0.5rem)]" : "right-[calc(100%+0.5rem)]",
      )}
    >
      <MascotAvatar color={profile.avatarColor} expression="sorriso" size={44} />
    </span>
  );
}

/** Confete que sai do nó quando a atividade acabou de ser concluída. */
function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {BURST_ANGLES.map((angle, i) => (
        <span
          key={angle}
          className="anim-burst absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full"
          style={
            {
              "--a": `${angle}deg`,
              background: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6"][i % 4],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

/**
 * Um nó da trilha, em 3D (face + base escura que "afunda" ao tocar). O estado se distingue por
 * forma, ícone e texto — nunca só por cor: concluída (cor da habilidade + selo ✓), atual (maior,
 * verde, quica, halo pulsante, tag COMEÇAR e a Hi torcendo), bloqueada (cinza + cadeado) e
 * checkpoint (quadrado arredondado + troféu).
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
  const colors = isDone ? DONE_COLORS[activity.skill] : isCurrent ? CURRENT_COLORS : LOCKED_COLORS;

  return (
    <div
      className="absolute flex w-40 -translate-x-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: y }}
    >
      <div className="relative" style={{ height: 88, width: 88 }}>
        {isCurrent && (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "anim-node-ping absolute inset-1 bg-accent/40",
                isCheckpoint ? "rounded-[2rem]" : "rounded-full",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "anim-node-ping-late absolute inset-1 bg-accent/30",
                isCheckpoint ? "rounded-[2rem]" : "rounded-full",
              )}
            />
            <span className="absolute inset-x-0 -top-5 z-10 flex justify-center">
              <span className="anim-tag-bob rounded-full bg-card px-3 py-1 text-[11px] font-bold tracking-wider shadow-[var(--shadow-card)]">
                COMEÇAR
              </span>
            </span>
            <CheeringMascot side={x > 50 ? "left" : "right"} />
          </>
        )}
        {isDone && justCompleted && <Burst />}
        <div
          className={cn(
            "absolute inset-0 grid place-items-center",
            isCurrent && "anim-node-bounce",
          )}
        >
          <button
            ref={ref}
            type="button"
            onClick={onPress}
            aria-label={`${skill.label}, ${statusSpoken(status, activity.minutes, needsReview)}`}
            className={cn(
              "node3d grid place-items-center motion-reduce:transition-none",
              shape,
              isDone && justCompleted && "anim-node-pop",
            )}
            style={
              {
                height: size,
                width: size,
                "--face": colors.face,
                "--edge": colors.edge,
              } as CSSProperties
            }
          >
            {isLocked ? (
              <Lock className="h-7 w-7 text-foreground/45 drop-shadow-[0_2px_0_oklch(1_0_0/0.6)]" />
            ) : (
              <Icon
                className="relative z-10 h-8 w-8 text-white drop-shadow-[0_3px_0_oklch(0_0_0/0.28)]"
                strokeWidth={2.4}
                fill={activity.skill === "reconhecer" ? "currentColor" : "none"}
              />
            )}
          </button>
        </div>
        {isDone && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 right-0 z-10 grid h-7 w-7 place-items-center rounded-full border-2 border-white text-white shadow-md",
              needsReview ? "bg-butter text-foreground" : "bg-emerald-700",
              justCompleted && "anim-node-pop",
            )}
          >
            {needsReview ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
          </span>
        )}
      </div>
      <div className="mt-3 rounded-2xl bg-background/60 px-3 py-1 text-center backdrop-blur-sm">
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
            strokeWidth={solid ? 6 : 4}
            strokeDasharray={solid ? undefined : "1 11"}
            className={solid ? "stroke-teal-700" : "stroke-foreground/25"}
          />
        );
      })}
    </svg>
  );
}
