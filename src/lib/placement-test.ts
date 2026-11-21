import type { Level } from "./profile-store";

/**
 * TESTE DE NIVELAMENTO — adaptativo e curto (no máximo 10 perguntas).
 *
 * Começa no nível que a pessoa escolheu e faz 2 perguntas por nível:
 * - 2 acertos: sobe um nível (ou termina, se o de cima já foi testado ou se é o C1);
 * - 1 acerto: termina nesse nível;
 * - 0 acertos: desce um nível (ou termina, se o de baixo já foi aprovado ou se é o A1).
 * "Não sei" conta como erro (chute é o que mais estraga um teste curto). É uma estimativa, não
 * uma certificação: a pessoa sempre pode mudar o nível depois no perfil.
 *
 * Tudo aqui é função pura (sem aleatoriedade): mesma sequência de respostas, mesmo resultado.
 */

export const PLACEMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number];

export const QUESTIONS_PER_LEVEL = 2;
export const MAX_PLACEMENT_QUESTIONS = PLACEMENT_LEVELS.length * QUESTIONS_PER_LEVEL;

export type PlacementQuestion = {
  id: string;
  level: PlacementLevel;
  /** Instrução curta em português. */
  instruction: string;
  /** O enunciado (em inglês, com a lacuna `___` quando for de completar). */
  prompt: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

const COMPLETE = "Escolha a opção que completa a frase.";

/** 4 perguntas por nível: cada pessoa vê 2, e `seed` muda quais (refazer o teste não repete). */
export const PLACEMENT_BANK: PlacementQuestion[] = [
  // A1 — to be, presente simples, there is/are
  {
    id: "a1-be",
    level: "A1",
    instruction: COMPLETE,
    prompt: "She ___ a teacher.",
    options: ["are", "is", "am", "be"],
    correct: 1,
  },
  {
    id: "a1-present",
    level: "A1",
    instruction: COMPLETE,
    prompt: "I ___ coffee every morning.",
    options: ["drinks", "drinking", "drink", "drank"],
    correct: 2,
  },
  {
    id: "a1-aux",
    level: "A1",
    instruction: COMPLETE,
    prompt: "___ you like pizza?",
    options: ["Does", "Are", "Is", "Do"],
    correct: 3,
  },
  {
    id: "a1-there",
    level: "A1",
    instruction: COMPLETE,
    prompt: "There ___ three people in my team.",
    options: ["is", "are", "am", "be"],
    correct: 1,
  },

  // A2 — passado simples, going to, modais
  {
    id: "a2-past",
    level: "A2",
    instruction: COMPLETE,
    prompt: "Yesterday I ___ the report to my manager.",
    options: ["sended", "send", "sent", "sending"],
    correct: 2,
  },
  {
    id: "a2-going",
    level: "A2",
    instruction: COMPLETE,
    prompt: "We ___ visit the client next week.",
    options: ["are going to", "going to", "goes to", "did"],
    correct: 0,
  },
  {
    id: "a2-can",
    level: "A2",
    instruction: COMPLETE,
    prompt: "___ you help me with this task, please?",
    options: ["Are", "Can", "Does", "Is"],
    correct: 1,
  },
  {
    id: "a2-didnt",
    level: "A2",
    instruction: COMPLETE,
    prompt: "He didn't ___ to the meeting yesterday.",
    options: ["went", "goes", "going", "go"],
    correct: 3,
  },

  // B1 — present perfect, condicionais 1 e 2, passiva básica
  {
    id: "b1-perfect",
    level: "B1",
    instruction: COMPLETE,
    prompt: "I ___ in this company since 2020.",
    options: ["work", "worked", "have worked", "am working"],
    correct: 2,
  },
  {
    id: "b1-cond2",
    level: "B1",
    instruction: COMPLETE,
    prompt: "If I ___ more time, I would learn Spanish.",
    options: ["have", "had", "will have", "would have"],
    correct: 1,
  },
  {
    id: "b1-passive",
    level: "B1",
    instruction: COMPLETE,
    prompt: "The report ___ by the team last week.",
    options: ["finished", "was finished", "is finishing", "has finish"],
    correct: 1,
  },
  {
    id: "b1-cond1",
    level: "B1",
    instruction: COMPLETE,
    prompt: "If the deadline ___ earlier, we will lose the client.",
    options: ["moves", "moved", "will move", "moving"],
    correct: 0,
  },

  // B2 — condicional 3, relativas, conectivos, passiva com modal
  {
    id: "b2-cond3",
    level: "B2",
    instruction: COMPLETE,
    prompt: "If we ___ earlier, we would have caught the bug.",
    options: ["tested", "had tested", "would test", "have tested"],
    correct: 1,
  },
  {
    id: "b2-relative",
    level: "B2",
    instruction: COMPLETE,
    prompt: "The project ___ we launched last year was a success.",
    options: ["who", "whose", "that", "whom"],
    correct: 2,
  },
  {
    id: "b2-link",
    level: "B2",
    instruction: COMPLETE,
    prompt: "___ it was late, we decided to finish the report.",
    options: ["Although", "Despite", "Because of", "Even"],
    correct: 0,
  },
  {
    id: "b2-modal-passive",
    level: "B2",
    instruction: COMPLETE,
    prompt: "The contract ___ before Friday.",
    options: ["must sign", "must been signed", "must be signing", "must be signed"],
    correct: 3,
  },

  // C1 — inversão, expressões, registro
  {
    id: "c1-inversion",
    level: "C1",
    instruction: COMPLETE,
    prompt: "Rarely ___ such a clear presentation.",
    options: ["I have seen", "have I seen", "I saw", "did I saw"],
    correct: 1,
  },
  {
    id: "c1-nosooner",
    level: "C1",
    instruction: COMPLETE,
    prompt: "No sooner ___ the meeting than the alarm went off.",
    options: ["we had started", "did we start", "had we started", "we started"],
    correct: 2,
  },
  {
    id: "c1-idiom",
    level: "C1",
    instruction: "Escolha o significado da expressão.",
    prompt: "What does “off the top of my head” mean?",
    options: ["sem checar, de improviso", "com muita raiva", "muito rápido", "em cima da mesa"],
    correct: 0,
  },
  {
    id: "c1-register",
    level: "C1",
    instruction: "Escolha a opção mais formal.",
    prompt: "Which sentence is the most formal way to decline?",
    options: [
      "No way, we can't do that.",
      "Sorry, can't.",
      "I regret to inform you that we are unable to proceed.",
      "Nope, not happening.",
    ],
    correct: 2,
  },
];

export type PlacementState = {
  /** Muda quais 2 das 4 perguntas de cada nível aparecem. */
  seed: number;
  start: PlacementLevel;
  current: PlacementLevel;
  /** Respostas por nível, na ordem (true = acertou). */
  results: Partial<Record<PlacementLevel, boolean[]>>;
  /** Preenchido quando o teste termina. */
  placed: PlacementLevel | null;
};

export function placementRank(level: string): number {
  const rank = (PLACEMENT_LEVELS as readonly string[]).indexOf(level);
  return rank === -1 ? 0 : rank;
}

/** O teste vai até o C1: quem diz C2 começa no C1. */
export function clampToPlacement(level: Level): PlacementLevel {
  return level === "C2" ? "C1" : level;
}

export function startPlacement(declared: Level, seed = 0): PlacementState {
  const start = clampToPlacement(declared);
  return { seed, start, current: start, results: {}, placed: null };
}

export function currentQuestion(state: PlacementState): PlacementQuestion | null {
  if (state.placed) return null;
  const ofLevel = PLACEMENT_BANK.filter((q) => q.level === state.current);
  const asked = state.results[state.current]?.length ?? 0;
  return ofLevel[(state.seed * QUESTIONS_PER_LEVEL + asked) % ofLevel.length] ?? null;
}

/** Registra a resposta da pergunta atual e decide o próximo passo. Não faz nada se já terminou. */
export function answerPlacement(state: PlacementState, correct: boolean): PlacementState {
  if (state.placed) return state;
  const current = state.current;
  const answers = [...(state.results[current] ?? []), correct];
  const results = { ...state.results, [current]: answers };
  if (answers.length < QUESTIONS_PER_LEVEL) return { ...state, results };

  const i = placementRank(current);
  const hits = answers.filter(Boolean).length;
  const above = PLACEMENT_LEVELS[i + 1];
  const below = PLACEMENT_LEVELS[i - 1];

  if (hits === QUESTIONS_PER_LEVEL) {
    // Passou. Sobe — a não ser que seja o topo ou o de cima já tenha sido testado (e reprovado).
    if (!above || (results[above]?.length ?? 0) >= QUESTIONS_PER_LEVEL) {
      return { ...state, results, placed: current };
    }
    return { ...state, results, current: above };
  }
  if (hits > 0) return { ...state, results, placed: current };

  // Zero acertos. Desce — a não ser que seja o piso ou o de baixo já tenha sido aprovado.
  if (!below) return { ...state, results, placed: current };
  if ((results[below]?.length ?? 0) >= QUESTIONS_PER_LEVEL) {
    return { ...state, results, placed: below };
  }
  return { ...state, results, current: below };
}

export function placementAnswered(state: PlacementState): number {
  return Object.values(state.results).reduce((sum, list) => sum + (list?.length ?? 0), 0);
}
