import {
  BookOpen,
  MessageCircle,
  MessageSquareText,
  Mic,
  PenLine,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { CURRICULUM, type CurriculumItem, type CurriculumUnit } from "@/lib/curriculum";
import { COURSE_DEFS, type CourseDef } from "@/lib/courses";
// Só tipos: `lessons.ts` importa este arquivo (TRAIL_LESSONS), então não pode haver import de valor de volta.
import type { Lesson, LessonStep, LessonWord } from "@/lib/lessons";

/**
 * Trilha: transforma `curriculum.ts` em seções → unidades → atividades e gera, pra cada
 * atividade, uma lição jogável no mesmo motor das "Palavras de hoje" (rotas /licao/$id).
 * Assim a trilha e o atalho da Home usam a mesma lição, o mesmo progresso e os mesmos baralhos.
 */

export type SkillId = "entrada" | "recordar" | "aplicar" | "falar" | "checkpoint";

/** As 4 etapas da unidade (Entrada → Recordar → Aplicar → Falar) + o checkpoint que mistura tudo. */
export const SKILLS: Record<SkillId, { label: string; tone: string; icon: LucideIcon }> = {
  entrada: { label: "Entrada", tone: "bg-butter", icon: BookOpen },
  recordar: { label: "Recordar", tone: "bg-lilac", icon: PenLine },
  aplicar: { label: "Aplicar", tone: "bg-peach", icon: MessageCircle },
  falar: { label: "Falar", tone: "bg-sky", icon: Mic },
  checkpoint: { label: "Checkpoint", tone: "bg-mint", icon: Trophy },
};

/**
 * Quantas atividades da trilha principal a pessoa precisa concluir pra liberar os cursos extras:
 * 5 = a primeira unidade inteira. Os cursos complementam a trilha, não a substituem.
 */
export const EXTRA_COURSES_UNLOCK_ACTIVITIES = 5;

/** Acerto mínimo (%) no checkpoint (inclui a fala) pra abrir a próxima unidade. */
export const CHECKPOINT_PASS_ACCURACY = 70;

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
  /** Código do planejamento (A1.1…). */
  code: string;
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

/** Id estável do item: a expressão em minúsculas, só letras/números, único em toda a trilha. */
function makeId(en: string, used: Set<string>) {
  const base =
    en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
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

type Entry = { item: CurriculumItem; word: LessonWord };

function toEntry(item: CurriculumItem, index: number, used: Set<string>): Entry {
  return {
    item,
    word: {
      id: makeId(item.en, used),
      en: item.en,
      ipa: item.ipa,
      pt: item.pt,
      example: item.example,
      examplePt: item.examplePt,
      icon: item.icon ?? MessageSquareText,
      tone: WORD_TONES[index % WORD_TONES.length] ?? "bg-sky",
    },
  };
}

/** `count` itens espalhados pela lista toda (não só os primeiros), na ordem original. */
function pickSpread<T>(items: T[], count: number): T[] {
  if (count >= items.length) return items;
  if (count <= 1) return items.slice(0, count);
  const step = (items.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => items[Math.round(i * step)]!);
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

function paresStep(group: LessonWord[]): LessonStep {
  const wordIds = group.map((w) => w.id);
  // Gira a coluna da direita em 1: nenhuma linha começa já combinada.
  const rightOrder = [...wordIds.slice(1), ...wordIds.slice(0, 1)];
  return { kind: "pares", wordIds, rightOrder };
}

function sentenceOf(word: LessonWord) {
  return word.example.replace(/[.!?]+$/, "");
}

/** Monte a frase: as peças são a frase do item + até 2 peças de outras frases da lista. */
function ordenarStep(word: LessonWord, pool: LessonWord[]): LessonStep {
  const answer = sentenceOf(word);
  const tokens = answer.split(" ");
  const known = new Set(tokens.map((t) => t.toLowerCase()));
  const extras: string[] = [];
  for (const other of others(pool, pool.indexOf(word), pool.length)) {
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

/** Complete a conversa: a lacuna é o `gap` do item; as opções erradas também vêm do item. */
function dialogoStep(unit: CurriculumUnit, entry: Entry, position: number): LessonStep {
  const { item, word } = entry;
  if (item.stage !== "aplicar") {
    throw new Error(`"${item.en}" (${unit.id}) não é um item de Aplicar.`);
  }
  const at = word.example.indexOf(item.gap);
  if (at === -1) {
    throw new Error(
      `O exemplo de "${item.en}" (${unit.id}) precisa conter a lacuna "${item.gap}".`,
    );
  }
  const options: string[] = [...item.wrong];
  options.splice(position % (options.length + 1), 0, item.gap);
  return {
    kind: "dialogo",
    wordId: word.id,
    context: unit.context,
    hi: item.ask.en,
    hiPt: item.ask.pt,
    before: word.example.slice(0, at).trim(),
    after: word.example.slice(at + item.gap.length).trim(),
    answerPt: word.examplePt,
    options,
    correct: item.gap,
  };
}

function falarStep(word: LessonWord): LessonStep {
  return { kind: "falar", wordId: word.id, target: word.example, targetPt: word.examplePt };
}

/** Estimativa de duração: cada tipo de passo tem um peso (em minutos). */
const STEP_MINUTES: Record<LessonStep["kind"], number> = {
  descobrir: 0.35,
  escolha: 0.3,
  pares: 0.7,
  ordenar: 0.6,
  dialogo: 0.5,
  falar: 0.6,
};

function estimateMinutes(steps: LessonStep[]) {
  return Math.max(2, Math.ceil(steps.reduce((sum, s) => sum + STEP_MINUTES[s.kind], 0)));
}

type UnitParts = {
  unit: CurriculumUnit;
  all: Entry[];
  entrada: Entry[];
  aplicar: Entry[];
  falar: Entry[];
};

type ActivityPlan = {
  skill: SkillId;
  title: string;
  objectives: (parts: UnitParts) => string[];
  words: (parts: UnitParts) => Entry[];
  steps: (parts: UnitParts) => LessonStep[];
};

const wordsOf = (entries: Entry[]) => entries.map((e) => e.word);

const PLANS: ActivityPlan[] = [
  {
    skill: "entrada",
    title: "Conheça as palavras e expressões",
    objectives: (p) => [
      `Ouvir e entender ${p.entrada.length} palavras e expressões novas`,
      "Ver cada uma em uma frase de verdade",
      "Ligar cada item ao seu significado",
    ],
    words: (p) => p.entrada,
    steps: (p) => {
      const words = wordsOf(p.entrada);
      const steps: LessonStep[] = [];
      // De 4 em 4: conhece os itens e já os liga ao significado antes de seguir.
      for (let start = 0; start < words.length; start += 4) {
        const group = words.slice(start, start + 4);
        steps.push(...group.map((w): LessonStep => ({ kind: "descobrir", wordId: w.id })));
        steps.push(paresStep(group.length === 4 ? group : words.slice(-4)));
      }
      return steps;
    },
  },
  {
    skill: "recordar",
    title: "Monte suas frases",
    objectives: (p) => [
      `Montar ${Math.min(8, p.entrada.length)} frases em inglês`,
      "Lembrar o que acabou de aprender, sem palavras novas",
      "Escrever frases completas no contexto profissional",
    ],
    words: (p) => p.entrada,
    steps: (p) => {
      const pool = wordsOf(p.entrada);
      return pickSpread(pool, 8).map((w) => ordenarStep(w, pool));
    },
  },
  {
    skill: "aplicar",
    title: "Use nas conversas",
    objectives: (p) => [
      `Responder situações reais: ${p.unit.context.toLowerCase()}`,
      "Completar a conversa com a expressão certa",
    ],
    words: (p) => p.aplicar,
    steps: (p) => p.aplicar.map((entry, i) => dialogoStep(p.unit, entry, i + 1)),
  },
  {
    skill: "falar",
    title: "Fale em voz alta",
    objectives: (p) => [
      `Ouvir e repetir ${p.falar.length} frases prontas`,
      "Treinar a pronúncia com o microfone",
    ],
    words: (p) => p.falar,
    steps: (p) => p.falar.map((entry) => falarStep(entry.word)),
  },
  {
    skill: "checkpoint",
    title: "Mostre o que você aprendeu",
    objectives: () => [
      "Montar, aplicar e falar o que viu na unidade",
      `Acertar pelo menos ${CHECKPOINT_PASS_ACCURACY}% pra abrir a próxima unidade`,
    ],
    words: (p) => p.all,
    steps: (p) => {
      // Sem itens novos: mistura tudo, alternando montar → aplicar e fechando com a fala.
      const pool = wordsOf(p.entrada);
      const montar = pickSpread(pool, 3).map((w) => ordenarStep(w, pool));
      const aplicar = pickSpread(p.aplicar, 3).map((e, i) => dialogoStep(p.unit, e, i + 2));
      const falar = pickSpread(p.falar, 2).map((e) => falarStep(e.word));
      return [
        ...montar.flatMap((step, i) => (aplicar[i] ? [step, aplicar[i]!] : [step])),
        ...falar,
      ];
    },
  },
];

/** Transforma uma unidade do currículo em 5 atividades, cada uma com a sua lição jogável. */
function buildUnit(
  unit: CurriculumUnit,
  sectionId: string,
  number: number,
  used: Set<string>,
  lessons: Lesson[],
): Unit {
  const all = unit.items.map((item, i) => toEntry(item, i, used));
  const parts: UnitParts = {
    unit,
    all,
    entrada: all.filter((e) => e.item.stage === "entrada"),
    aplicar: all.filter((e) => e.item.stage === "aplicar"),
    falar: all.filter((e) => e.item.stage === "falar"),
  };
  const activities = PLANS.map((plan): Activity => {
    const id = `${unit.id}-${plan.skill}`;
    const words = wordsOf(plan.words(parts));
    const steps = plan.steps(parts);
    const minutes = estimateMinutes(steps);
    lessons.push({
      id,
      title: `${unit.title} · ${SKILLS[plan.skill].label}`,
      deckName: unit.deckName ?? unit.title,
      minutes,
      words,
      steps,
    });
    return {
      id,
      unitId: unit.id,
      skill: plan.skill,
      title: plan.title,
      minutes,
      objectives: plan.objectives(parts),
      wordIds: words.map((w) => w.id),
      lessonId: id,
    };
  });
  return {
    id: unit.id,
    sectionId,
    number,
    code: unit.code,
    title: unit.title,
    description: unit.description,
    activities,
  };
}

export type Course = Omit<CourseDef, "units"> & { units: Unit[] };

function build() {
  const lessons: Lesson[] = [];
  const used = new Set<string>();
  let unitNumber = 0;
  const sections: Section[] = CURRICULUM.sections.map((section, sectionIndex) => ({
    id: section.id,
    number: sectionIndex + 1,
    title: section.title,
    level: section.level,
    units: section.units.map((unit) => buildUnit(unit, section.id, ++unitNumber, used, lessons)),
  }));
  // Os cursos extras vêm depois da trilha: assim os ids de palavra da trilha principal não mudam.
  // A numeração das unidades recomeça em 1 em cada curso.
  const courses: Course[] = COURSE_DEFS.map((def) => ({
    ...def,
    units: def.units.map((unit, i) => buildUnit(unit, def.id, i + 1, used, lessons)),
  }));
  return { sections, courses, lessons };
}

const built = build();

export const TRAIL_NAME = CURRICULUM.name;
export const SECTIONS: Section[] = built.sections;
/** Lições jogáveis de toda a plataforma: trilha principal + cursos extras. */
export const TRAIL_LESSONS: Lesson[] = built.lessons;
export const COURSES: Course[] = built.courses;
export const UNITS: Unit[] = SECTIONS.flatMap((s) => s.units);
/** Todas as atividades na ordem em que são liberadas. */
export const ACTIVITIES: Activity[] = UNITS.flatMap((u) => u.activities);

/** Atividades dos cursos extras (cada curso tem a sua própria ordem de liberação). */
export const COURSE_ACTIVITIES: Activity[] = COURSES.flatMap((c) =>
  c.units.flatMap((u) => u.activities),
);

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id) ?? COURSE_ACTIVITIES.find((a) => a.id === id);
}

export function getUnit(id: string): Unit | undefined {
  return UNITS.find((u) => u.id === id) ?? COURSES.flatMap((c) => c.units).find((u) => u.id === id);
}

export function getUnitOf(activity: Activity): Unit {
  const unit = getUnit(activity.unitId);
  if (!unit) throw new Error(`Unidade desconhecida: ${activity.unitId}`);
  return unit;
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

/** Curso a que a unidade pertence (`undefined` = é da trilha principal). */
export function getCourseOfUnit(unit: Unit): Course | undefined {
  return COURSES.find((c) => c.id === unit.sectionId);
}

/** Curso a que a atividade pertence (`undefined` = é da trilha principal). */
export function getCourseOfActivity(activity: Activity): Course | undefined {
  return COURSES.find((c) => c.units.some((u) => u.id === activity.unitId));
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

// ---------------------------------------------------------------------------------------------
// Nível do perfil → o que a pessoa vê na trilha.
// ---------------------------------------------------------------------------------------------

export const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export function levelRank(level: string): number {
  const rank = (LEVEL_ORDER as readonly string[]).indexOf(level);
  return rank === -1 ? 0 : rank;
}

/**
 * Nível da trilha que a pessoa segue: o maior nível COM conteúdo que não passa do nível dela
 * (quem é B1 enquanto só existe A1 segue o A1). Sem nenhum conteúdo abaixo, o primeiro que existir.
 */
export function getTrackLevel(profileLevel: string): string {
  const withContent = SECTIONS.filter((s) => s.units.length > 0);
  const rank = levelRank(profileLevel);
  const eligible = withContent.filter((s) => levelRank(s.level) <= rank);
  return (eligible.at(-1) ?? withContent[0])?.level ?? LEVEL_ORDER[0];
}

/** Seções mostradas: as do nível da pessoa e as anteriores. As de nível acima ficam escondidas. */
export function getVisibleSections(profileLevel: string): Section[] {
  const limit = Math.max(levelRank(profileLevel), levelRank(getTrackLevel(profileLevel)));
  return SECTIONS.filter((s) => levelRank(s.level) <= limit);
}

export function getVisibleUnits(profileLevel: string): Unit[] {
  return getVisibleSections(profileLevel).flatMap((s) => s.units);
}

/** Seção de nível abaixo do que a pessoa segue: fica aberta para revisão e não trava ninguém. */
export function isReviewSection(section: Section, profileLevel: string): boolean {
  return levelRank(section.level) < levelRank(getTrackLevel(profileLevel));
}

/**
 * Próximo nível com conteúdo acima do que a pessoa segue (e do nível do perfil), se existir.
 * É o destino do "Seguir para o próximo nível" quando ela termina a trilha atual.
 */
export function getNextLevelWithContent(profileLevel: string): string | null {
  const limit = Math.max(levelRank(profileLevel), levelRank(getTrackLevel(profileLevel)));
  const next = SECTIONS.find((s) => s.units.length > 0 && levelRank(s.level) > limit);
  return next?.level ?? null;
}

/** Atividades que a pessoa percorre em ordem: as das seções do nível dela (sem as de revisão). */
export function getTrackActivities(profileLevel: string): Activity[] {
  return getVisibleSections(profileLevel)
    .filter((s) => !isReviewSection(s, profileLevel))
    .flatMap((s) => s.units.flatMap((u) => u.activities));
}
