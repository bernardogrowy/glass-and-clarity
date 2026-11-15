import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LessonCta, LessonFrame } from "@/components/lesson/LessonUi";
import { scheduleForTomorrow } from "@/lib/lesson-words";
import { recordStep } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { speak } from "@/lib/speech";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/licao/$id/pares")({
  head: () => ({ meta: [{ title: "Associar pares — Hi" }] }),
  component: ParesRoute,
});

function ParesRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("pares", id);
  if (!ctx) return null;
  return <Pares key={ctx.index} ctx={ctx} />;
}

type Side = "en" | "pt";

function Pares({ ctx }: { ctx: StepContext<"pares"> }) {
  const { lesson, step, index, total } = ctx;
  const next = useLessonNext(lesson, index);
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ en: string; pt: string } | null>(null);
  const [missed, setMissed] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const done = matched.length === step.wordIds.length;

  const finish = (nextMissed: string[]) => {
    recordStep(index, {
      correct: nextMissed.length === 0,
      wordIds: step.wordIds,
      missedWordIds: nextMissed,
      reachedStage: 2,
    });
    for (const wordId of nextMissed) scheduleForTomorrow(lesson, getWord(lesson, wordId));
  };

  const tap = (side: Side, id: string) => {
    if (done || wrong || matched.includes(id)) return;
    if (side === "en" && !muted) speak(getWord(lesson, id).en);

    if (!selected || selected.side === side) {
      setSelected({ side, id });
      return;
    }
    const enId = side === "en" ? id : selected.id;
    const ptId = side === "pt" ? id : selected.id;
    setSelected(null);

    if (enId === ptId) {
      const nextMatched = [...matched, enId];
      setMatched(nextMatched);
      if (nextMatched.length === step.wordIds.length) finish(missed);
      return;
    }
    const nextMissed = missed.includes(enId) ? missed : [...missed, enId];
    setMissed(nextMissed);
    setWrong({ en: enId, pt: ptId });
    timer.current = setTimeout(() => setWrong(null), 650);
  };

  const tileClass = (side: Side, id: string) => {
    const isMatched = matched.includes(id);
    const isSelected = selected?.side === side && selected.id === id;
    const isWrong = wrong !== null && wrong[side] === id;
    return cn(
      "press flex h-[72px] items-center justify-center gap-2 rounded-3xl border-2 px-3 text-lg font-semibold",
      "bg-card shadow-[var(--shadow-card)]",
      isMatched && "border-accent bg-mint text-foreground",
      isSelected && "border-foreground bg-sky/40",
      isWrong && "animate-pulse border-destructive bg-peach/70",
      !isMatched && !isSelected && !isWrong && "border-transparent",
    );
  };

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="pares"
      footer={
        done ? (
          <LessonCta onClick={next} autoFocus>
            Continuar <ArrowRight className="h-4 w-4" />
          </LessonCta>
        ) : (
          <button
            onClick={() => setMuted((m) => !m)}
            className="mx-auto py-2 text-base font-semibold text-teal-800 underline underline-offset-4"
          >
            {muted ? "Ativar som" : "Sem som agora"}
          </button>
        )
      }
    >
      <div className="text-center">
        <h1 className="font-display text-4xl">Toque nos pares</h1>
        <p className="mt-1 text-muted-foreground">Ouça, leia e conecte as palavras.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-3">
        {step.wordIds.map((enId, row) => {
          const ptId = step.rightOrder[row] ?? enId;
          return (
            <div key={enId} className="contents">
              <button
                aria-pressed={selected?.side === "en" && selected.id === enId}
                disabled={matched.includes(enId)}
                onClick={() => tap("en", enId)}
                className={tileClass("en", enId)}
              >
                {matched.includes(enId) ? (
                  <Check className="h-5 w-5 text-emerald-700" />
                ) : (
                  !muted && <Volume2 className="h-4 w-4" />
                )}
                {getWord(lesson, enId).en}
              </button>
              <button
                aria-pressed={selected?.side === "pt" && selected.id === ptId}
                disabled={matched.includes(ptId)}
                onClick={() => tap("pt", ptId)}
                className={tileClass("pt", ptId)}
              >
                {matched.includes(ptId) && <Check className="h-5 w-5 text-emerald-700" />}
                {getWord(lesson, ptId).pt}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center">
        <span className="rounded-full bg-mint px-4 py-2 text-sm font-semibold" aria-live="polite">
          {matched.length} de {step.wordIds.length} pares
        </span>
      </p>
    </LessonFrame>
  );
}
