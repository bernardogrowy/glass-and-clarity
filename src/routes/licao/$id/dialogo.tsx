import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { ExampleCard, FeedbackSheet, LessonCta, LessonFrame } from "@/components/lesson/LessonUi";
import { scheduleForTomorrow, useSaveWord } from "@/lib/lesson-words";
import { recordStep } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/licao/$id/dialogo")({
  head: () => ({ meta: [{ title: "Complete a conversa — Hi" }] }),
  component: DialogoRoute,
});

/** Texto depois da lacuna: sem espaço antes de pontuação ("…skills." e não "…skills ."). */
function afterGap(after: string) {
  if (!after) return "";
  return /^[.,;:!?]/.test(after) ? after : ` ${after}`;
}

function DialogoRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("dialogo", id);
  if (!ctx) return null;
  return <Dialogo key={ctx.index} ctx={ctx} />;
}

function Dialogo({ ctx }: { ctx: StepContext<"dialogo"> }) {
  const { lesson, step, index, total } = ctx;
  const word = getWord(lesson, step.wordId);
  const next = useLessonNext(lesson, index);
  const { saved, save } = useSaveWord(lesson, word);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const isCorrect = selected === step.correct;

  const verify = () => {
    if (!selected || checked) return;
    setChecked(true);
    recordStep(index, {
      correct: isCorrect,
      wordIds: [word.id],
      missedWordIds: isCorrect ? [] : [word.id],
      reachedStage: 4,
    });
    if (!isCorrect) scheduleForTomorrow(lesson, word);
  };

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="dialogo"
      footer={
        !checked && (
          <LessonCta onClick={verify} disabled={!selected}>
            Verificar
          </LessonCta>
        )
      }
    >
      <div className="text-center">
        <h1 className="font-display text-4xl leading-tight">Complete a conversa</h1>
        <span className="mt-3 inline-block rounded-full bg-sky px-4 py-2 text-sm font-semibold">
          {step.context}
        </span>
      </div>

      <div className="mt-8">
        <div className="max-w-[85%] rounded-3xl rounded-bl-lg bg-[color-mix(in_oklch,var(--accent)_45%,white)] px-5 py-3.5 text-lg">
          {step.hi}
        </div>
        <p className="mt-1 px-2 text-sm text-muted-foreground">{step.hiPt}</p>

        <div className="mt-5 ml-auto max-w-[90%]">
          <div className="glass-dark rounded-3xl rounded-br-lg px-5 py-4 text-lg leading-loose">
            {step.before}{" "}
            <span
              className={cn(
                "inline-block min-w-[7rem] rounded-full px-3 py-0.5 text-center font-semibold text-foreground",
                selected ? "bg-butter" : "bg-butter/40 text-transparent",
                checked && !isCorrect && "bg-peach",
              )}
            >
              {selected ?? "…"}
            </span>
            {afterGap(step.after)}
          </div>
          <p className="mt-1 px-2 text-right text-sm text-muted-foreground">{step.answerPt}</p>
        </div>
      </div>

      <p className="mt-8 text-muted-foreground">Escolha a palavra que completa a frase</p>
      <div role="radiogroup" aria-label="Palavras" className="mt-3 flex flex-wrap gap-3">
        {step.options.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={selected === option}
            disabled={checked}
            onClick={() => setSelected(option)}
            className={cn(
              "press rounded-full border-2 bg-card px-6 py-3.5 text-lg font-semibold shadow-[var(--shadow-card)]",
              selected === option ? "border-foreground bg-butter" : "border-transparent",
            )}
          >
            {option}
          </button>
        ))}
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
              Aqui cabe <strong>{step.correct}</strong>: {step.before}{" "}
              <strong>{step.correct}</strong>
              {afterGap(step.after)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-medium">
                <Check className="h-4 w-4 text-emerald-700" />
                Resposta: {step.correct}
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
