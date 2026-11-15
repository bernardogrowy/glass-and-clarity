import { Briefcase, CalendarDays, Clock, Sparkles, Target, type LucideIcon } from "lucide-react";
import { TRAIL_LESSONS } from "@/lib/trail";

/**
 * Conteúdo das lições de vocabulário. Cada palavra passa por 4 etapas:
 * Descobrir → Reconhecer → Recordar → Aplicar (ver `Stage`).
 * A ordem das opções/peças é fixa (não aleatória) pra evitar mismatch de hidratação.
 */

export type Stage = "descobrir" | "reconhecer" | "recordar" | "aplicar";

export const STAGES: { id: Stage; label: string; tone: string }[] = [
  { id: "descobrir", label: "Descobrir", tone: "bg-butter" },
  { id: "reconhecer", label: "Reconhecer", tone: "bg-sky" },
  { id: "recordar", label: "Recordar", tone: "bg-lilac" },
  { id: "aplicar", label: "Aplicar", tone: "bg-peach" },
];

export type LessonWord = {
  id: string;
  en: string;
  ipa: string;
  pt: string;
  example: string;
  examplePt: string;
  icon: LucideIcon;
  tone: string;
};

export type ChoiceOption = { pt: string; en: string };

export type LessonStep =
  | { kind: "descobrir"; wordId: string }
  | { kind: "escolha"; wordId: string; options: ChoiceOption[]; correct: number }
  | { kind: "pares"; wordIds: string[]; rightOrder: string[] }
  | {
      kind: "ordenar";
      wordId: string;
      promptPt: string;
      answer: string;
      tiles: string[];
    }
  | {
      kind: "dialogo";
      wordId: string;
      context: string;
      hi: string;
      hiPt: string;
      before: string;
      after: string;
      answerPt: string;
      options: string[];
      correct: string;
    };

export type StepKind = LessonStep["kind"];

export type Lesson = {
  id: string;
  title: string;
  deckName: string;
  minutes: number;
  words: LessonWord[];
  steps: LessonStep[];
};

export const STEP_STAGE: Record<StepKind, Stage> = {
  descobrir: "descobrir",
  escolha: "reconhecer",
  pares: "reconhecer",
  ordenar: "recordar",
  dialogo: "aplicar",
};

const interviewWords: LessonWord[] = [
  {
    id: "experience",
    en: "experience",
    ipa: "/ɪkˈspɪr.i.əns/",
    pt: "experiência profissional",
    example: "I have two years of experience in marketing.",
    examplePt: "Tenho dois anos de experiência em marketing.",
    icon: Briefcase,
    tone: "bg-sky",
  },
  {
    id: "skills",
    en: "skills",
    ipa: "/skɪlz/",
    pt: "habilidades",
    example: "I have strong communication skills.",
    examplePt: "Tenho boas habilidades de comunicação.",
    icon: Sparkles,
    tone: "bg-mint",
  },
  {
    id: "available",
    en: "available",
    ipa: "/əˈveɪ.lə.bəl/",
    pt: "disponível",
    example: "I am available for an interview.",
    examplePt: "Estou disponível para uma entrevista.",
    icon: Clock,
    tone: "bg-butter",
  },
  {
    id: "position",
    en: "position",
    ipa: "/pəˈzɪʃ.ən/",
    pt: "vaga",
    example: "I'd like to apply for the position.",
    examplePt: "Eu gostaria de me candidatar à vaga.",
    icon: Target,
    tone: "bg-lilac",
  },
  {
    id: "deadline",
    en: "deadline",
    ipa: "/ˈded.laɪn/",
    pt: "prazo final",
    example: "We need to meet the deadline.",
    examplePt: "Precisamos cumprir o prazo.",
    icon: CalendarDays,
    tone: "bg-peach",
  },
];

const interview: Lesson = {
  id: "entrevista",
  title: "Entrevista de emprego",
  deckName: "Entrevista de emprego",
  minutes: 4,
  words: interviewWords,
  steps: [
    { kind: "descobrir", wordId: "deadline" },
    { kind: "descobrir", wordId: "experience" },
    {
      kind: "escolha",
      wordId: "deadline",
      options: [
        { pt: "Reunião", en: "meeting" },
        { pt: "Prazo final", en: "deadline" },
        { pt: "Contrato", en: "contract" },
        { pt: "Experiência profissional", en: "experience" },
      ],
      correct: 1,
    },
    {
      kind: "pares",
      wordIds: ["deadline", "available", "skills", "position"],
      rightOrder: ["available", "position", "deadline", "skills"],
    },
    {
      kind: "escolha",
      wordId: "position",
      options: [
        { pt: "Salário", en: "salary" },
        { pt: "Entrevista", en: "interview" },
        { pt: "Vaga", en: "position" },
        { pt: "Currículo", en: "resume" },
      ],
      correct: 2,
    },
    {
      kind: "ordenar",
      wordId: "available",
      promptPt: "Estou disponível para uma entrevista.",
      answer: "I am available for an interview",
      tiles: ["available", "for", "an", "I", "interview", "have", "am"],
    },
    {
      kind: "ordenar",
      wordId: "position",
      promptPt: "Eu gostaria de me candidatar à vaga.",
      answer: "I'd like to apply for the position",
      tiles: ["the", "apply", "position", "I'd", "for", "make", "like", "to"],
    },
    {
      kind: "dialogo",
      wordId: "experience",
      context: "Entrevista de emprego",
      hi: "Tell me about your experience.",
      hiPt: "Fale sobre sua experiência.",
      before: "I have two years of",
      after: "in marketing.",
      answerPt: "Tenho dois anos de experiência em marketing.",
      options: ["experience", "available", "position"],
      correct: "experience",
    },
  ],
};

/** `interview` é o fallback do atalho "Palavras de hoje"; as demais são as atividades da trilha. */
export const LESSONS: Lesson[] = [interview, ...TRAIL_LESSONS];
export const DAILY_LESSON_ID = interview.id;

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getWord(lesson: Lesson, wordId: string): LessonWord {
  const word = lesson.words.find((w) => w.id === wordId);
  if (!word) throw new Error(`Palavra desconhecida: ${wordId}`);
  return word;
}
