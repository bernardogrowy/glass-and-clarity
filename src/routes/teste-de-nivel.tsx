import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  EXIT_TEST_PASS_ACCURACY,
  EXIT_TEST_QUESTIONS,
  buildLevelExitTest,
  daySeed,
  scoreLevelExitTest,
  type ExitQuestion,
  type ExitResult,
} from "@/lib/level-exit-test";
import { updateProfile, useProfileStore, type Level } from "@/lib/profile-store";
import { getNextLevelWithContent, getTrackLevel } from "@/lib/trail";
import { canTryLevelExit, finishLevelExit, startLevelExit, useTrailStore } from "@/lib/trail-store";

export const Route = createFileRoute("/teste-de-nivel")({
  head: () => ({ meta: [{ title: "Teste para avançar de nível — Hi" }] }),
  component: TesteDeNivel,
});

const DONT_KNOW = -1;

type Phase =
  | { kind: "intro" }
  | { kind: "testing"; questions: ExitQuestion[]; answers: number[] }
  | { kind: "result"; result: ExitResult; from: string; to: string };

function TesteDeNivel() {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const trail = useTrailStore();
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [selected, setSelected] = useState<number | null>(null);

  const level = getTrackLevel(profile.level);
  const nextLevel = getNextLevelWithContent(profile.level);

  // Sem nível acima para ir (já no último): não há o que testar.
  useEffect(() => {
    if (!nextLevel && phase.kind === "intro") navigate({ to: "/trilha", replace: true });
  }, [nextLevel, phase.kind, navigate]);

  const now = Date.now();
  const canTry = canTryLevelExit(trail, level, now);

  if (!nextLevel && phase.kind === "intro") return null;

  const begin = () => {
    const at = Date.now();
    // A tentativa do dia é gasta ao começar: recarregar a página não dá uma segunda chance.
    if (!startLevelExit(level, at)) return;
    setSelected(null);
    setPhase({ kind: "testing", questions: buildLevelExitTest(level, daySeed(at)), answers: [] });
  };

  const confirm = () => {
    if (phase.kind !== "testing" || selected === null) return;
    const answers = [...phase.answers, selected];
    setSelected(null);
    if (answers.length < phase.questions.length) {
      setPhase({ ...phase, answers });
      return;
    }
    const result = scoreLevelExitTest(phase.questions, answers);
    const at = Date.now();
    finishLevelExit(level, result.accuracy, result.passed, at);
    // Passou: o nível de cima vira o nível do perfil na hora (o de baixo fica aberto para revisão).
    const to = getNextLevelWithContent(level);
    if (result.passed && to) updateProfile({ ...profile, level: to as Level });
    setPhase({ kind: "result", result, from: level, to: to ?? level });
  };

  return (
    <AppShell hideTabs>
      <Link
        to="/trilha"
        className="glass press inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Trilha
      </Link>

      {phase.kind === "intro" && nextLevel && (
        <section className="surface mt-5 rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Teste para avançar
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight">Você já domina o {level}?</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            São {EXIT_TEST_QUESTIONS} perguntas com o conteúdo das unidades do {level}. Acertando{" "}
            {EXIT_TEST_PASS_ACCURACY}% ou mais, você segue direto para o {nextLevel}, e o {level}{" "}
            continua aberto para revisão.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Só uma tentativa por dia, e ela conta assim que você começa.</li>
            <li>Você só vê o resultado no fim.</li>
            <li>Se não passar, nada muda na sua trilha.</li>
          </ul>
          {canTry ? (
            <button
              type="button"
              onClick={begin}
              className="glass-dark press mt-5 flex h-14 w-full items-center justify-center rounded-full font-medium"
            >
              Começar o teste
            </button>
          ) : (
            <p className="mt-5 rounded-2xl bg-butter/40 p-4 text-sm leading-snug">
              Você já fez o teste hoje. Volte amanhã para tentar de novo. Enquanto isso, continue a
              trilha para se preparar.
            </p>
          )}
        </section>
      )}

      {phase.kind === "testing" && (
        <Question
          question={phase.questions[phase.answers.length]!}
          index={phase.answers.length}
          total={phase.questions.length}
          level={level}
          selected={selected}
          onSelect={setSelected}
          onConfirm={confirm}
        />
      )}

      {phase.kind === "result" && <Result result={phase.result} from={phase.from} to={phase.to} />}
    </AppShell>
  );
}

function Question({
  question,
  index,
  total,
  level,
  selected,
  onSelect,
  onConfirm,
}: {
  question: ExitQuestion;
  index: number;
  total: number;
  level: string;
  selected: number | null;
  onSelect: (i: number) => void;
  onConfirm: () => void;
}) {
  // Nos níveis iniciais, mostra a tradução da fala da Hi como apoio.
  const showHint = level === "A1" || level === "A2";
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
        {showHint && question.promptPt && (
          <p className="mt-1 text-sm text-muted-foreground">{question.promptPt}</p>
        )}
        {question.sentence && (
          <p className="mt-3 text-lg leading-snug">
            {question.sentence.before}{" "}
            <span className="inline-block min-w-16 border-b-2 border-foreground/40 text-center">
              &nbsp;
            </span>{" "}
            {question.sentence.after}
          </p>
        )}
      </div>

      <div role="radiogroup" aria-label="Opções" className="mt-4 space-y-3">
        {question.options.map((option, i) => (
          <button
            key={`${question.id}-${option}`}
            type="button"
            role="radio"
            aria-checked={selected === i}
            onClick={() => onSelect(i)}
            className={`press w-full rounded-2xl p-4 text-left font-medium ${
              selected === i ? "glass-dark" : "surface"
            }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={selected === DONT_KNOW}
          onClick={() => onSelect(DONT_KNOW)}
          className={`press w-full rounded-2xl p-4 text-left text-sm ${
            selected === DONT_KNOW ? "glass-dark" : "glass text-muted-foreground"
          }`}
        >
          Não sei
        </button>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={selected === null}
        className="glass-dark press mt-6 flex h-14 w-full items-center justify-center rounded-full font-medium disabled:opacity-50"
      >
        {index + 1 === total ? "Ver resultado" : "Responder"}
      </button>
    </div>
  );
}

function Result({ result, from, to }: { result: ExitResult; from: string; to: string }) {
  return (
    <section className="surface mt-5 rounded-3xl p-5 text-center">
      <p className="text-xs font-medium text-muted-foreground">
        {result.correct} de {result.total} certas
      </p>
      <h1 className="mt-2 font-display text-4xl leading-tight">{result.accuracy}%</h1>
      {result.passed ? (
        <>
          <p className="mt-3 font-display text-2xl leading-snug">Você avançou para o {to}!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O {from} continua aberto para revisão quando quiser.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-2xl leading-snug">Ainda não foi desta vez</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Era preciso {EXIT_TEST_PASS_ACCURACY}% para seguir para o {to}. Sua trilha continua como
            estava, e você pode tentar de novo amanhã.
          </p>
          {result.weakUnits.length > 0 && (
            <div className="mt-4 rounded-2xl bg-butter/40 p-4 text-left text-sm">
              <p className="font-medium">Vale revisar:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.weakUnits.map((u) => (
                  <li key={u.unitId}>{u.unitTitle}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <Link
        to="/trilha"
        className="glass-dark press mt-5 flex h-12 items-center justify-center rounded-full font-medium"
      >
        {result.passed ? `Ir para o ${to}` : "Voltar à trilha"}
      </Link>
    </section>
  );
}
