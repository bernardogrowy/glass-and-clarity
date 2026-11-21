import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Plus, Volume2 } from "lucide-react";
import { ExampleCard, LessonCta, LessonFrame, SpeakButton } from "@/components/lesson/LessonUi";
import { useSaveWord } from "@/lib/lesson-words";
import { markDiscovered } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { speak } from "@/lib/speech";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";

export const Route = createFileRoute("/licao/$id/descobrir")({
  head: () => ({ meta: [{ title: "Descobrir palavra — Hi" }] }),
  component: DescobrirRoute,
});

function DescobrirRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("descobrir", id);
  if (!ctx) return null;
  return <Descobrir key={ctx.index} ctx={ctx} />;
}

function Descobrir({ ctx }: { ctx: StepContext<"descobrir"> }) {
  const { lesson, step, index, total } = ctx;
  const word = getWord(lesson, step.wordId);
  const next = useLessonNext(lesson, index);
  const { saved, save } = useSaveWord(lesson, word);
  const Icon = word.icon;

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="descobrir"
      footer={
        <>
          <button
            onClick={save}
            disabled={saved}
            className="glass press flex h-14 w-full items-center justify-center gap-2 rounded-full font-medium disabled:opacity-70"
          >
            {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {saved ? "Salvo no baralho" : "Salvar no baralho"}
          </button>
          <LessonCta
            onClick={() => {
              markDiscovered(word.id);
              next();
            }}
          >
            Entendi <ArrowRight className="h-4 w-4" />
          </LessonCta>
        </>
      }
    >
      <article className="surface rounded-[2rem] p-6 text-center">
        <div className={`${word.tone} mx-auto grid h-16 w-16 place-items-center rounded-full`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1
          className={
            word.en.length > 16
              ? "mt-5 font-display text-3xl leading-tight"
              : "mt-5 font-display text-5xl leading-none"
          }
        >
          {word.en}
        </h1>
        {word.ipa && <p className="mt-3 text-muted-foreground">{word.ipa}</p>}
        <div className="mt-4 flex items-center justify-center gap-3">
          <SpeakButton text={word.en} label={`Ouvir ${word.en}`} dark className="h-14 w-14" />
          <button
            type="button"
            onClick={() => speak(word.en, "en-US", 0.5)}
            aria-label={`Ouvir ${word.en} devagar`}
            className="glass press flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
          >
            <Volume2 className="h-4 w-4" />
            0,5×
          </button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">significa</p>
        <p className="font-display text-3xl">{word.pt}</p>
      </article>

      <div className="mt-4">
        <ExampleCard word={word} tone="bg-butter" />
      </div>
    </LessonFrame>
  );
}
