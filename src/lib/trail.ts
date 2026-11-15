import { Eye, Flag, Layers, MessageCircle, PenLine, type LucideIcon } from "lucide-react";
import { CURRICULUM, type CurriculumUnit, type CurriculumWord } from "@/lib/curriculum";
// Só tipos: `lessons.ts` importa este arquivo (TRAIL_LESSONS), então não pode haver import de valor de volta.
import type { ChoiceOption, Lesson, LessonStep, LessonWord } from "@/lib/lessons";

/**
 * Trilha de vocabulário: transforma `curriculum.ts` em seções → unidades → atividades e gera,
 * pra cada atividade, uma lição jogável no mesmo motor das "Palavras de hoje" (rotas /licao/$id).
 * Assim a trilha e o atalho da Home usam a mesma lição, o mesmo progresso e os mesmos baralhos.
 */

export type SkillId = "descobrir" | "reconhecer" | "recordar" | "aplicar" | "checkpoint";

/** Mesmas 4 etapas da lição (Descobrir → Reconhecer → Recordar → Aplicar) + o checkpoint da unidade. */
export const SKILLS: Record<SkillId, { label: string; tone: string; icon: LucideIcon }> = {
  descobrir: { label: "Descobrir", tone: "bg-butter", icon: Layers },
  reconhecer: { label: "Reconhecer", tone: "bg-sky", icon: Eye },
  recordar: { label: "Recordar", tone: "bg-lilac", icon: PenLine },
  aplicar: { label: "Aplicar", tone: "bg-peach", icon: MessageCircle },
  checkpoint: { label: "Checkpoint", tone: "bg-mint", icon: Flag },
};

/** Acerto mínimo (%) no checkpoint pra abrir a próxima unidade. */
export const CHECKPOINT_PASS_ACCURACY = 60;

export type Activity = {
  /** Igual ao id da lição jogável. */
  id: string;
  unitId: string;
  skill: SkillId;
  title: string;
  minutes: number;
  objectives: string[];
  wordIds: string[];
  lessonId: string;
};

export type Unit = {
  id: string;
  sectionId: string;
  /** Posição global (1, 2, 3…) — "Unidade 2" na tela. */
  number: number;
  title: string;
  description: string;
  activities: Activity[];
};

export type Section = {
  id: string;
  number: number;
  title: string;
  level: string;
  units: Unit[];
};

const WORD_TONES = ["bg-sky", "bg-mint", "bg-butter", "bg-lilac", "bg-peach"];

function slug(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, "-");
}

function cap(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Embaralha sem Math.random (mesma ordem no servidor e no cliente → sem mismatch de hidratação). */
function stableShuffle<T>(items: T[], key: (item: T) => string, salt: string): T[] {
  const hash = (text: string) => {
    let h = 7;
    for (const char of text) h = (h * 31 + char.charCodeAt(0)) % 9973;
    return h;
  };
  return items
    .map((item, i) => ({ item, order: hash(`${key(item)}:${salt}:${i}`) }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.item);
}

function toLessonWord(word: CurriculumWord, index: number): LessonWord {
  return {
    id: slug(word.en),
    en: word.en,
    ipa: word.ipa,
    pt: word.pt,
    example: word.example,
    examplePt: word.examplePt,
    icon: word.icon,
    tone: WORD_TONES[index % WORD_TONES.length] ?? "bg-sky",
  };
}

/** As palavras ao redor de `index` (circular), sem incluir a própria. */
function others<T>(items: T[], index: number, count: number): T[] {
  const result: T[] = [];
  for (let step = 1; step < items.length && result.length < count; step++) {
    const item = items[(index + step) % items.length];
    if (item !== undefined) result.push(item);
  }
  return result;
}

function escolhaStep(words: LessonWord[], i: number): LessonStep {
  const word = words[i]!;
  const options: ChoiceOption[] = others(words, i, 3).map((w) => ({ pt: cap(w.pt), en: w.en }));
  const correct = i % (options.length + 1);
  options.splice(correct, 0, { pt: cap(word.pt), en: word.en });
  return { kind: "escolha", wordId: word.id, options, correct };
}

function paresStep(words: LessonWord[]): LessonStep {
  const wordIds = words.slice(0, 4).map((w) => w.id);
  // Gira a coluna da direita em 1: nenhuma linha começa já combinada.
  const rightOrder = [...wordIds.slice(1), ...wordIds.slice(0, 1)];
  return { kind: "pares", wordIds, rightOrder };
}

function sentenceOf(word: LessonWord) {
  return word.example.replace(/[.!?]+$/, "");
}

function ordenarStep(words: LessonWord[], i: number): LessonStep {
  const word = words[i]!;
  const answer = sentenceOf(word);
  const tokens = answer.split(" ");
  const known = new Set(tokens.map((t) => t.toLowerCase()));
  const extras: string[] = [];
  for (const other of others(words, i, words.length)) {
    for (const token of sentenceOf(other).split(" ")) {
      const lower = token.toLowerCase();
      if (extras.length < 2 && !known.has(lower)) {
        known.add(lower);
        extras.push(token);
      }
    }
  }
  let tiles = stableShuffle([...tokens, ...extras], (t) => t, word.id);
  if (tiles.slice(0, tokens.length).join(" ") === answer) tiles = [...tiles].reverse();
  return { kind: "ordenar", wordId: word.id, promptPt: word.examplePt, answer, tiles };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dialogoStep(
  unit: CurriculumUnit,
  words: LessonWord[],
  source: CurriculumWord[],
  i: number,
): LessonStep {
  const word = words[i]!;
  const match = new RegExp(`\\b${escapeRegExp(word.en)}\\b`, "i").exec(word.example);
  if (!match) {
    throw new Error(`Exemplo de "${word.en}" (${unit.id}) precisa conter a palavra exatamente.`);
  }
  const options = others(words, i, 2).map((w) => w.en);
  options.splice((i + 1) % (options.length + 1), 0, word.en);
  return {
    kind: "dialogo",
    wordId: word.id,
    context: unit.context,
    hi: source[i]!.ask.en,
    hiPt: source[i]!.ask.pt,
    before: word.example.slice(0, match.index).trim(),
    after: word.example.slice(match.index + match[0].length).trim(),
    answerPt: word.examplePt,
    options,
    correct: word.en,
  };
}

type ActivityPlan = {
  skill: SkillId;
  title: string;
  minutes: number;
  objectives: (unit: CurriculumUnit) => string[];
  steps: (unit: CurriculumUnit, words: LessonWord[], source: CurriculumWord[]) => LessonStep[];
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const PLANS: ActivityPlan[] = [
  {
    skill: "descobrir",
    title: "Conheça as palavras da unidade",
    minutes: 3,
    objectives: (u) => [
      `Ouvir e entender ${u.words.length} palavras novas`,
      "Ver cada palavra em uma frase de verdade",
      "Ligar cada palavra ao seu significado",
    ],
    steps: (_u, words) => [
      ...words.map((w): LessonStep => ({ kind: "descobrir", wordId: w.id })),
      paresStep(words),
    ],
  },
  {
    skill: "reconhecer",
    title: "Reconheça cada significado",
    minutes: 2,
    objectives: () => [
      "Escolher o significado certo de cada palavra",
      "Reforçar as palavras que acabou de descobrir",
    ],
    steps: (_u, words) => range(words.length).map((i) => escolhaStep(words, i)),
  },
  {
    skill: "recordar",
    title: "Construa suas primeiras frases",
    minutes: 4,
    objectives: (u) => [
      `Montar ${u.words.length} frases em inglês`,
      "Lembrar cada palavra sem ver a tradução",
      "Escrever frases completas no contexto profissional",
    ],
    steps: (_u, words) => range(words.length).map((i) => ordenarStep(words, i)),
  },
  {
    skill: "aplicar",
    title: "Use as palavras em conversas",
    minutes: 3,
    objectives: (u) => [
      `Responder situações reais: ${u.context.toLowerCase()}`,
      "Escolher a palavra certa pra completar a conversa",
    ],
    steps: (u, words, source) => range(words.length).map((i) => dialogoStep(u, words, source, i)),
  },
  {
    skill: "checkpoint",
    title: "Mostre o que você aprendeu",
    minutes: 4,
    objectives: () => [
      "Reconhecer, montar e aplicar as palavras da unidade",
      `Acertar pelo menos ${CHECKPOINT_PASS_ACCURACY}% pra abrir a próxima unidade`,
    ],
    steps: (u, words, source) => {
      const at = (i: number) => i % words.length;
      // Um de cada tipo, alternando, sobre palavras diferentes.
      return [
        escolhaStep(words, at(0)),
        ordenarStep(words, at(1)),
        dialogoStep(u, words, source, at(2)),
        escolhaStep(words, at(3)),
        ordenarStep(words, at(4)),
        dialogoStep(u, words, source, at(0)),
      ];
    },
  },
];

function build() {
  const lessons: Lesson[] = [];
  let unitNumber = 0;
  const sections: Section[] = CURRICULUM.sections.map((section, sectionIndex) => ({
    id: section.id,
    number: sectionIndex + 1,
    title: section.title,
    level: section.level,
    units: section.units.map((unit): Unit => {
      unitNumber += 1;
      const words = unit.words.map(toLessonWord);
      const activities = PLANS.map((plan): Activity => {
        const id = `${unit.id}-${plan.skill}`;
        lessons.push({
          id,
          title: `${unit.title} · ${SKILLS[plan.skill].label}`,
          deckName: unit.deckName ?? unit.title,
          minutes: plan.minutes,
          words,
          steps: plan.steps(unit, words, unit.words),
        });
        return {
          id,
          unitId: unit.id,
          skill: plan.skill,
          title: plan.title,
          minutes: plan.minutes,
          objectives: plan.objectives(unit),
          wordIds: words.map((w) => w.id),
          lessonId: id,
        };
      });
      return {
        id: unit.id,
        sectionId: section.id,
        number: unitNumber,
        title: unit.title,
        description: unit.description,
        activities,
      };
    }),
  }));
  return { sections, lessons };
}

const built = build();

export const TRAIL_NAME = CURRICULUM.name;
export const SECTIONS: Section[] = built.sections;
export const TRAIL_LESSONS: Lesson[] = built.lessons;
export const UNITS: Unit[] = SECTIONS.flatMap((s) => s.units);
/** Todas as atividades na ordem em que são liberadas. */
export const ACTIVITIES: Activity[] = UNITS.flatMap((u) => u.activities);

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id);
}

export function getUnitOf(activity: Activity): Unit {
  const unit = getUnit(activity.unitId);
  if (!unit) throw new Error(`Unidade desconhecida: ${activity.unitId}`);
  return unit;
}

export function getSectionOf(unit: Unit): Section {
  const section = SECTIONS.find((s) => s.id === unit.sectionId);
  if (!section) throw new Error(`Seção desconhecida: ${unit.sectionId}`);
  return section;
}

/** Atividade anterior na ordem de liberação (a que precisa ser concluída pra abrir esta). */
export function getPreviousActivity(activity: Activity): Activity | undefined {
  const i = ACTIVITIES.findIndex((a) => a.id === activity.id);
  return i > 0 ? ACTIVITIES[i - 1] : undefined;
}
