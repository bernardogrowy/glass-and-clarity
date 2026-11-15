import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";
import { FeedbackSheet, LessonCta, LessonFrame, SpeakButton } from "@/components/lesson/LessonUi";
import { scheduleForTomorrow, useSaveWord } from "@/lib/lesson-words";
import { MascotAvatar } from "@/components/MascotAvatar";
import { recordStep } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { useProfileStore } from "@/lib/profile-store";
import { speak } from "@/lib/speech";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";

export const Route = createFileRoute("/licao/$id/ordenar")({
  head: () => ({ meta: [{ title: "Monte a frase — Hi" }] }),
  component: OrdenarRoute,
});

function OrdenarRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("ordenar", id);
  if (!ctx) return null;
  return <Ordenar key={ctx.index} ctx={ctx} />;
}

function Ordenar({ ctx }: { ctx: StepContext<"ordenar"> }) {
  const { lesson, step, index, total } = ctx;
  const word = getWord(lesson, step.wordId);
  const profile = useProfileStore();
  const next = useLessonNext(lesson, index);
  const { saved, save } = useSaveWord(lesson, word);
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const built = placed.map((i) => step.tiles[i]).join(" ");
  const isCorrect = built === step.answer;

  const verify = () => {
    if (placed.length === 0 || checked) return;
    setChecked(true);
    recordStep(index, {
      correct: isCorrect,
      wordIds: [word.id],
      missedWordIds: isCorrect ? [] : [word.id],
      reachedStage: 3,
    });
    if (!isCorrect) scheduleForTomorrow(lesson, word);
    else speak(step.answer);
  };

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="ordenar"
      footer={
        !checked && (
          <LessonCta onClick={verify} disabled={placed.length === 0}>
            Verificar
          </LessonCta>
        )
      }
    >
      <h1 className="text-center font-display text-4xl leading-tight">Monte a frase em inglês</h1>

      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-card shadow-[var(--shadow-card)]">
          <MascotAvatar
            color={profile.avatarColor}
            expression={profile.avatarExpression}
            size={44}
          />
        </span>
        <div className="surface flex flex-1 items-center gap-3 rounded-3xl rounded-tl-lg px-4 py-3">
          <SpeakButton
            text={step.promptPt}
            lang="pt-BR"
            label="Ouvir a frase em português"
            className="h-10 w-10"
          />
          <p className="text-lg leading-snug">{step.promptPt}</p>
        </div>
      </div>

      <div
        aria-label="Sua frase"
        aria-live="polite"
        className="mt-6 flex min-h-[7.5rem] flex-wrap content-start gap-2 border-b-2 border-foreground/10 pb-2"
      >
        {placed.map((tileIndex) => (
          <button
            key={tileIndex}
            disabled={checked}
            onClick={() => setPlaced((p) => p.filter((i) => i !== tileIndex))}
            className="press h-12 rounded-2xl bg-card px-5 text-lg font-semibold shadow-[var(--shadow-card)]"
          >
            {step.tiles[tileIndex]}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {step.tiles.map((tile, i) =>
          placed.includes(i) ? (
            <span
              key={i}
              aria-hidden="true"
              className="h-12 rounded-2xl bg-foreground/10 px-5 text-lg font-semibold text-transparent"
            >
              {tile}
            </span>
          ) : (
            <button
              key={i}
              disabled={checked}
              onClick={() => setPlaced((p) => [...p, i])}
              className="press h-12 rounded-2xl bg-card px-5 text-lg font-semibold shadow-[var(--shadow-card)]"
            >
              {tile}
            </button>
          ),
        )}
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
            <p className="font-display text-2xl leading-snug">{step.answer}.</p>
            <p className="mt-1 text-muted-foreground">{step.promptPt}</p>
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
            <p className="text-muted-foreground">A frase certa é:</p>
            <p className="mt-1 font-display text-2xl leading-snug">{step.answer}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-sm font-medium">
                <Check className="h-4 w-4 text-emerald-700" />
                {word.en} = {word.pt}
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
