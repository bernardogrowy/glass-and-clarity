import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { PracticeQuestion } from "@/lib/practice-questions";
import { REVIEW_SESSION_SIZE, buildReviewSession, getReviewDue } from "@/lib/review-session";
import { answerReview, getReviewTotals, useReviewStore } from "@/lib/review-store";
import { registerActivity } from "@/lib/streak-store";

export const Route = createFileRoute("/revisao")({
  head: () => ({
    meta: [
      { title: "Revisão do dia — Hi" },
      {
        name: "description",
        content: "Revise palavras de unidades anteriores no momento certo para não esquecer.",
      },
    ],
  }),
  component: Revisao,
});

const DONT_KNOW = -1;

type Phase =
  | { kind: "intro" }
  | { kind: "testing"; questions: PracticeQuestion[]; index: number; hits: number }
  | { kind: "done"; hits: number; total: number };

function Revisao() {
  const review = useReviewStore();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [selected, setSelected] = useState<number | null>(null);
  /** Depois de responder: o que foi marcado (a pergunta fica travada até "Continuar"). */
  const [answered, setAnswered] = useState<number | null>(null);

  const now = Date.now();
  const due = getReviewDue(review, now);
  const totals = getReviewTotals(review);

  const begin = () => {
    const questions = buildReviewSession(review, Date.now(), Date.now() % 100_000);
    if (questions.length === 0) return;
    setSelected(null);
    setAnswered(null);
    setPhase({ kind: "testing", questions, index: 0, hits: 0 });
  };

  const confirm = () => {
    if (phase.kind !== "testing" || selected === null || answered !== null) return;
    const question = phase.questions[phase.index]!;
    const correct = selected === question.correct;
    // Grava na hora: sair no meio não perde o que já foi respondido.
    answerReview(question.wordId, correct);
    setAnswered(selected);
    setPhase({ ...phase, hits: phase.hits + (correct ? 1 : 0) });
  };

  const next = () => {
    if (phase.kind !== "testing") return;
    setSelected(null);
    setAnswered(null);
    if (phase.index + 1 < phase.questions.length) {
      setPhase({ ...phase, index: phase.index + 1 });
      return;
    }
    registerActivity();
    setPhase({ kind: "done", hits: phase.hits, total: phase.questions.length });
  };

  return (
    <AppShell hideTabs>
      <Link
        to="/trilha"
        className="glass press inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Trilha
      </Link>

      {phase.kind === "intro" && (
        <section className="surface mt-5 rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Revisão do dia
          </p>
          {due.length > 0 ? (
            <>
              <h1 className="mt-2 font-display text-3xl leading-tight">
                {due.length} {due.length === 1 ? "palavra" : "palavras"} para revisar
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Palavras de unidades anteriores, misturadas, no momento em que você está prestes a
                esquecer. Cada sessão tem até {REVIEW_SESSION_SIZE} perguntas e você vê a resposta
                logo depois de responder. Quem você acerta volta mais tarde; quem você erra volta
                amanhã.
              </p>
              <button
                type="button"
                onClick={begin}
                className="glass-dark press mt-5 flex h-14 w-full items-center justify-center rounded-full font-medium"
              >
                Começar a revisão
              </button>
            </>
          ) : (
            <>
              <h1 className="mt-2 font-display text-3xl leading-tight">Nada para revisar agora</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {totals.total === 0
                  ? "As palavras entram aqui sozinhas conforme você conclui atividades da trilha. Comece uma unidade e volte amanhã."
                  : "Você está em dia. Quando chegar a hora de uma palavra, ela aparece aqui."}
              </p>
            </>
          )}
          {totals.total > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {totals.total} {totals.total === 1 ? "palavra" : "palavras"} na sua agenda ·{" "}
              {totals.mastered} bem {totals.mastered === 1 ? "fixada" : "fixadas"}
            </p>
          )}
        </section>
      )}

      {phase.kind === "testing" && (
        <Question
          question={phase.questions[phase.index]!}
          index={phase.index}
          total={phase.questions.length}
          selected={selected}
          answered={answered}
          onSelect={setSelected}
          onConfirm={confirm}
          onNext={next}
        />
      )}

      {phase.kind === "done" && (
        <section className="surface mt-5 rounded-3xl p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {phase.hits} de {phase.total} certas
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight">
            {phase.hits === phase.total ? "Revisão perfeita!" : "Revisão concluída"}
          </h1>
          {phase.hits < phase.total && (
            <p className="mt-2 text-sm text-muted-foreground">
              {phase.total - phase.hits === 1
                ? "A palavra que você errou volta"
                : "As palavras que você errou voltam"}{" "}
              amanhã.
            </p>
          )}
          {due.length > 0 ? (
            <button
              type="button"
              onClick={() => setPhase({ kind: "intro" })}
              className="glass-dark press mt-5 flex h-12 w-full items-center justify-center rounded-full font-medium"
            >
              Ainda há {due.length} para revisar
            </button>
          ) : (
            <Link
              to="/trilha"
              className="glass-dark press mt-5 flex h-12 items-center justify-center rounded-full font-medium"
            >
              Voltar à trilha
            </Link>
          )}
        </section>
      )}
    </AppShell>
  );
}

function Question({
  question,
  index,
  total,
  selected,
  answered,
  onSelect,
  onConfirm,
  onNext,
}: {
  question: PracticeQuestion;
  index: number;
  total: number;
  selected: number | null;
  answered: number | null;
  onSelect: (i: number) => void;
  onConfirm: () => void;
  onNext: () => void;
}) {
  const locked = answered !== null;
  const wasRight = answered === question.correct;

  return (
    <div className="mt-5">
      <p className="text-xs font-medium text-muted-foreground">
        Pergunta {index + 1} de {total}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-accent h-full rounded-full transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <div className="surface mt-5 rounded-3xl p-5">
        <p className="text-sm text-muted-foreground">{question.instruction}</p>
        <p className="mt-2 font-display text-2xl leading-snug">{question.prompt}</p>
        {question.promptPt && (
          <p className="mt-1 text-sm text-muted-foreground">{question.promptPt}</p>
        )}
        {question.sentence && (
          <p className="mt-3 text-lg leading-snug">
            {question.sentence.before}{" "}
            <span className="inline-block min-w-16 border-b-2 border-foreground/40 text-center">
              {locked ? question.options[question.correct] : " "}
            </span>{" "}
            {question.sentence.after}
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label="Opções" className="mt-4 space-y-3">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correct;
          const isPicked = answered === i;
          const tone = locked
            ? isCorrect
              ? "bg-mint"
              : isPicked
                ? "bg-peach"
                : "surface opacity-60"
            : selected === i
              ? "glass-dark"
              : "surface";
          return (
            <button
              key={`${question.id}-${option}`}
              type="button"
              role="radio"
              aria-checked={locked ? isPicked : selected === i}
              disabled={locked}
              onClick={() => onSelect(i)}
              className={`press flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left font-medium ${tone}`}
            >
              <span>{option}</span>
              {locked && isCorrect && <Check className="h-4 w-4 shrink-0" />}
              {locked && isPicked && !isCorrect && <X className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={locked ? answered === DONT_KNOW : selected === DONT_KNOW}
          disabled={locked}
          onClick={() => onSelect(DONT_KNOW)}
          className={`press w-full rounded-2xl p-4 text-left text-sm ${
            (locked ? answered === DONT_KNOW : selected === DONT_KNOW)
              ? "glass-dark"
              : "glass text-muted-foreground"
          }`}
        >
          Não sei
        </button>
      </div>

      {locked && (
        <div
          role="status"
          className={`mt-4 rounded-2xl p-4 text-sm leading-snug ${wasRight ? "bg-mint/50" : "bg-peach/50"}`}
        >
          <p className="font-medium">{wasRight ? "Isso mesmo!" : "Essa volta amanhã."}</p>
          {question.example && (
            <p className="mt-1 text-muted-foreground">
              {question.example.en}
              <br />
              {question.example.pt}
            </p>
          )}
        </div>
      )}

      {locked ? (
        <button
          type="button"
          onClick={onNext}
          className="glass-dark press mt-6 flex h-14 w-full items-center justify-center rounded-full font-medium"
        >
          {index + 1 === total ? "Ver resultado" : "Continuar"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onConfirm}
          disabled={selected === null}
          className="glass-dark press mt-6 flex h-14 w-full items-center justify-center rounded-full font-medium disabled:opacity-50"
        >
          Responder
        </button>
      )}
    </div>
  );
}
