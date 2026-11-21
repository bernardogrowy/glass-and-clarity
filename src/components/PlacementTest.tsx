import { useState } from "react";
import {
  MAX_PLACEMENT_QUESTIONS,
  answerPlacement,
  clampToPlacement,
  currentQuestion,
  placementAnswered,
  startPlacement,
  type PlacementLevel,
  type PlacementState,
} from "@/lib/placement-test";
import { NIVEL_INFO, nivelOpcaoFor } from "@/lib/onboarding-store";
import type { Level } from "@/lib/profile-store";

const DONT_KNOW = -1;

function levelLabel(level: Level) {
  const info = NIVEL_INFO[nivelOpcaoFor(level)];
  return `${info.tag} · ${info.label}`;
}

/**
 * Teste de nivelamento (obrigatório): explica, faz as perguntas e mostra o resultado. Não decide
 * nada sozinho: `onFinish` recebe o nível escolhido pela pessoa depois do resultado (o estimado ou
 * o que ela já tinha).
 */
export function PlacementTest({
  declared,
  seed = 0,
  onFinish,
}: {
  /** Nível que a pessoa disse ter: é de onde o teste começa. */
  declared: Level;
  seed?: number;
  onFinish: (choice: { level: PlacementLevel; estimated: PlacementLevel }) => void;
}) {
  const [state, setState] = useState<PlacementState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const start = clampToPlacement(declared);

  if (!state) {
    return (
      <div className="surface rounded-3xl p-5">
        <h2 className="font-display text-2xl leading-snug">Vamos confirmar seu nível?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          São até {MAX_PLACEMENT_QUESTIONS} perguntas rápidas, sem pressa e sem nota. O teste começa
          no nível que você escolheu ({start}) e se ajusta às suas respostas. Se não souber, é só
          marcar “Não sei”.
        </p>
        <button
          type="button"
          onClick={() => setState(startPlacement(declared, seed))}
          className="glass-dark press mt-5 flex h-14 w-full items-center justify-center rounded-full font-medium"
        >
          Fazer o teste
        </button>
      </div>
    );
  }

  if (state.placed) {
    const estimated = state.placed;
    const same = estimated === start;
    return (
      <div className="surface rounded-3xl p-5 text-center">
        <p className="text-xs font-medium text-muted-foreground">Seu nível estimado</p>
        <h2 className="mt-2 font-display text-4xl leading-tight">{estimated}</h2>
        <p className="mt-1 font-medium">{levelLabel(estimated)}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {same
            ? "É o mesmo nível que você escolheu. Combinou!"
            : `Você escolheu ${start}, mas suas respostas indicam ${estimated}. É o nível em que a trilha vai ser mais útil agora.`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          É uma estimativa rápida. Você pode mudar o nível depois no perfil.
        </p>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => onFinish({ level: estimated, estimated })}
            className="glass-dark press flex h-14 w-full items-center justify-center rounded-full font-medium"
          >
            Começar no {estimated}
          </button>
          {!same && (
            <button
              type="button"
              onClick={() => onFinish({ level: start, estimated })}
              className="glass press flex h-14 w-full items-center justify-center rounded-full font-medium"
            >
              Manter {start}
            </button>
          )}
        </div>
      </div>
    );
  }

  const question = currentQuestion(state);
  if (!question) return null;
  const answered = placementAnswered(state);

  const confirm = () => {
    if (selected === null) return;
    const correct = selected !== DONT_KNOW && selected === question.correct;
    setState(answerPlacement(state, correct));
    setSelected(null);
  };

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        Pergunta {answered + 1} · até {MAX_PLACEMENT_QUESTIONS}
      </p>
      <div className="surface mt-2 rounded-3xl p-5">
        <p className="text-sm text-muted-foreground">{question.instruction}</p>
        <p className="mt-2 font-display text-2xl leading-snug">{question.prompt}</p>
      </div>

      <div role="radiogroup" aria-label="Opções" className="mt-4 space-y-3">
        {question.options.map((option, i) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected === i}
            onClick={() => setSelected(i)}
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
          onClick={() => setSelected(DONT_KNOW)}
          className={`press w-full rounded-2xl p-4 text-left text-sm ${
            selected === DONT_KNOW ? "glass-dark" : "glass text-muted-foreground"
          }`}
        >
          Não sei
        </button>
      </div>

      <button
        type="button"
        onClick={confirm}
        disabled={selected === null}
        className="glass-dark press mt-6 flex h-14 w-full items-center justify-center rounded-full font-medium disabled:opacity-50"
      >
        Responder
      </button>
    </div>
  );
}
