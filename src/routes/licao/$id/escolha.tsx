import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, X } from "lucide-react";
import { useState } from "react";
import {
  ExampleCard,
  FeedbackSheet,
  LessonCta,
  LessonFrame,
  SpeakButton,
} from "@/components/lesson/LessonUi";
import { scheduleForTomorrow, useSaveWord } from "@/lib/lesson-words";
import { recordStep } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/licao/$id/escolha")({
  head: () => ({ meta: [{ title: "Escolha o significado — Hi" }] }),
  component: EscolhaRoute,
});

function EscolhaRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("escolha", id);
  if (!ctx) return null;
  return <Escolha key={ctx.index} ctx={ctx} />;
}

function Escolha({ ctx }: { ctx: StepContext<"escolha"> }) {
  const { lesson, step, index, total } = ctx;
  const word = getWord(lesson, step.wordId);
  const next = useLessonNext(lesson, index);
  const { saved, save } = useSaveWord(lesson, word);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const correctOption = step.options[step.correct];
  const picked = selected === null ? undefined : step.options[selected];
  const isCorrect = selected === step.correct;

  const verify = () => {
    if (selected === null || checked) return;
    setChecked(true);
    recordStep(index, {
      correct: isCorrect,
      wordIds: [word.id],
      missedWordIds: isCorrect ? [] : [word.id],
      reachedStage: 2,
    });
    if (!isCorrect) scheduleForTomorrow(lesson, word);
  };

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="escolha"
      footer={
        !checked && (
          <LessonCta onClick={verify} disabled={selected === null}>
            Verificar resposta
          </LessonCta>
        )
      }
    >
      <div className="text-center">
        <p className="text-lg text-muted-foreground">O que significa</p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <h1 className="font-display text-5xl leading-none">{word.en}</h1>
          <SpeakButton text={word.en} label={`Ouvir ${word.en}`} className="h-11 w-11" />
        </div>
      </div>

      <div role="radiogroup" aria-label="Opções" className="mt-8 space-y-3">
        {step.options.map((option, i) => {
          const isSelected = selected === i;
          const showRight = checked && i === step.correct;
          const showWrong = checked && isSelected && !isCorrect;
          return (
            <button
              key={option.pt}
              role="radio"
              aria-checked={isSelected}
              disabled={checked}
              onClick={() => setSelected(i)}
              className={cn(
                "press flex w-full items-center gap-4 rounded-3xl border-2 px-5 py-4 text-left text-lg font-medium",
                "bg-card shadow-[var(--shadow-card)]",
                isSelected && !checked && "border-foreground bg-sky/40",
                !isSelected && !showRight && "border-transparent",
                showRight && "border-accent bg-mint/60",
                showWrong && "border-destructive bg-peach/60",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold",
                  isSelected ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1">{option.pt}</span>
              {(showRight || (isSelected && !checked)) && <Check className="h-5 w-5" />}
              {showWrong && <X className="h-5 w-5 text-destructive" />}
            </button>
          );
        })}
      </div>

      {checked &&
        (isCorrect ? (
          <FeedbackSheet
            kind="ok"
            title="Muito bom!"
            actionLabel="Continuar"
            onAction={next}
            onSave={save}
            saved={saved}
          >
            <p className="text-xl">
              <strong>{word.en}</strong> = {word.pt}
            </p>
            <div className="mt-3">
              <ExampleCard word={word} />
            </div>
          </FeedbackSheet>
        ) : (
          <FeedbackSheet
            kind="almost"
            title="Quase lá!"
            actionLabel="Entendi"
            onAction={next}
            onSave={save}
            saved={saved}
          >
            <p className="text-lg">
              <strong>{word.en}</strong> é <strong>{correctOption?.pt.toLowerCase()}</strong>.
              {picked && (
                <>
                  {" "}
                  “{picked.pt}” seria <em>{picked.en}</em>.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-medium">
                <Check className="h-4 w-4 text-emerald-700" />
                Resposta: {correctOption?.pt.toLowerCase()}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-sky px-3.5 py-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                Volta na revisão de amanhã
              </span>
            </div>
          </FeedbackSheet>
        ))}
    </LessonFrame>
  );
}
