import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Mic, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeedbackSheet, LessonCta, LessonFrame, SpeakButton } from "@/components/lesson/LessonUi";
import { scheduleForTomorrow, useSaveWord } from "@/lib/lesson-words";
import { recordStep } from "@/lib/lesson-store";
import { getWord } from "@/lib/lessons";
import { canLiveCaption, startLiveCaptions } from "@/lib/live-captions";
import { speak, stopSpeaking } from "@/lib/speech";
import { speechPassed } from "@/lib/speech-match";
import { useLessonNext, useLessonStep, type StepContext } from "@/lib/use-lesson-step";

export const Route = createFileRoute("/licao/$id/falar")({
  head: () => ({ meta: [{ title: "Fale em voz alta — Hi" }] }),
  component: FalarRoute,
});

function FalarRoute() {
  const { id } = Route.useParams();
  const ctx = useLessonStep("falar", id);
  if (!ctx) return null;
  return <Falar key={ctx.index} ctx={ctx} />;
}

/**
 * Repetir uma frase em voz alta. Com reconhecimento de voz no navegador, a fala é avaliada pela
 * transcrição (`speechPassed`); sem ele (ex.: Firefox), a pessoa se autoavalia.
 */
function Falar({ ctx }: { ctx: StepContext<"falar"> }) {
  const { lesson, step, index, total } = ctx;
  const word = getWord(lesson, step.wordId);
  const next = useLessonNext(lesson, index);
  const { saved, save } = useSaveWord(lesson, word);
  const [supported] = useState(canLiveCaption);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [heardNothing, setHeardNothing] = useState(false);
  const [triedSelf, setTriedSelf] = useState(false);
  const [result, setResult] = useState<"ok" | "almost" | null>(null);
  const captions = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef("");

  // Sair da tela com o microfone aberto não pode deixar a legenda rodando.
  useEffect(
    () => () => {
      captions.current?.stop();
      stopSpeaking();
    },
    [],
  );

  const finish = (correct: boolean) => {
    if (result) return;
    setResult(correct ? "ok" : "almost");
    recordStep(index, {
      correct,
      wordIds: [word.id],
      missedWordIds: correct ? [] : [word.id],
      reachedStage: 4,
    });
    if (!correct) scheduleForTomorrow(lesson, word);
  };

  const startListening = () => {
    stopSpeaking();
    transcriptRef.current = "";
    setTranscript("");
    setHeardNothing(false);
    const started = startLiveCaptions((text) => {
      transcriptRef.current = text;
      setTranscript(text);
    });
    if (!started) {
      // O navegador negou/não tem reconhecimento: cai na autoavaliação.
      setTriedSelf(true);
      return;
    }
    captions.current = started;
    setListening(true);
  };

  const stopListening = () => {
    captions.current?.stop();
    captions.current = null;
    setListening(false);
    const heard = transcriptRef.current.trim();
    if (!heard) {
      setHeardNothing(true);
      return;
    }
    finish(speechPassed(step.target, heard));
  };

  const selfCheck = !supported || triedSelf;

  return (
    <LessonFrame
      index={index}
      total={total}
      kind="falar"
      footer={
        !result &&
        (selfCheck ? (
          <>
            <LessonCta onClick={() => finish(true)}>Consegui falar</LessonCta>
            <LessonCta onClick={() => finish(false)} variant="light">
              Preciso treinar mais
            </LessonCta>
          </>
        ) : listening ? (
          <LessonCta onClick={stopListening}>
            <Square className="h-4 w-4" /> Parar e verificar
          </LessonCta>
        ) : (
          <LessonCta onClick={startListening}>
            <Mic className="h-4 w-4" /> {heardNothing ? "Tentar de novo" : "Falar agora"}
          </LessonCta>
        ))
      }
    >
      <div className="text-center">
        <h1 className="font-display text-4xl leading-tight">Repita em voz alta</h1>
        <p className="mt-2 text-muted-foreground">Ouça o modelo e fale com calma.</p>
      </div>

      <article className="surface mt-8 rounded-[2rem] p-6 text-center">
        <p className="font-display text-3xl leading-snug">{step.target}</p>
        <p className="mt-3 text-muted-foreground">{step.targetPt}</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <SpeakButton text={step.target} label="Ouvir a frase" dark className="h-14 w-14" />
          <button
            type="button"
            onClick={() => speak(step.target, "en-US", 0.5)}
            aria-label="Ouvir a frase devagar"
            className="glass press flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-semibold"
          >
            <Volume2 className="h-4 w-4" />
            0,5×
          </button>
        </div>
      </article>

      {(listening || transcript) && (
        <p aria-live="polite" className="mt-6 rounded-3xl bg-sky/40 px-5 py-4 text-center text-lg">
          {transcript || "Estou ouvindo…"}
        </p>
      )}
      {heardNothing && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não consegui ouvir nada. Confira o microfone e tente de novo.
        </p>
      )}
      {selfCheck && !result && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Seu navegador não reconhece voz. Fale a frase em voz alta e diga como foi.
        </p>
      )}

      {result === "ok" && (
        <FeedbackSheet
          kind="ok"
          title="Mandou bem!"
          actionLabel="Continuar"
          onAction={next}
          onSave={save}
          saved={saved}
        >
          <p className="text-lg">{step.target}</p>
          {transcript && (
            <p className="mt-2 text-sm text-muted-foreground">Você disse: {transcript}</p>
          )}
        </FeedbackSheet>
      )}
      {result === "almost" && (
        <FeedbackSheet
          kind="almost"
          title="Quase lá!"
          actionLabel="Entendi"
          onAction={next}
          onSave={save}
          saved={saved}
        >
          <p className="text-lg">{step.target}</p>
          {transcript && (
            <p className="mt-2 text-sm text-muted-foreground">Você disse: {transcript}</p>
          )}
          <span className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-sky px-3.5 py-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            Volta na revisão de amanhã
          </span>
        </FeedbackSheet>
      )}
    </LessonFrame>
  );
}
