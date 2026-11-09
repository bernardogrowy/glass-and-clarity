import { useSyncExternalStore } from "react";
import type { Level } from "./profile-store";
import type { Competency } from "./progress-store";

export type Motivo =
  | "dia-a-dia"
  | "viajar"
  | "trabalhar"
  | "reunioes"
  | "entrevistas"
  | "estudar"
  | "prova"
  | "morar"
  | "amizades"
  | "midia"
  | "outro";

export const MOTIVO_LABELS: Record<Motivo, string> = {
  "dia-a-dia": "Conversar no dia a dia",
  viajar: "Viajar",
  trabalhar: "Trabalhar",
  reunioes: "Participar de reuniões",
  entrevistas: "Fazer entrevistas",
  estudar: "Estudar",
  prova: "Fazer uma prova",
  morar: "Morar em outro país",
  amizades: "Fazer amizades",
  midia: "Filmes, séries, músicas e podcasts",
  outro: "Outro motivo",
};
export const MOTIVO_LIST = Object.keys(MOTIVO_LABELS) as Motivo[];

export type PrimeiroObjetivo =
  | "apresentar"
  | "trabalho"
  | "reserva"
  | "informacoes"
  | "reuniao"
  | "entrevista"
  | "hobbies"
  | "podcast"
  | "viajar";

export const OBJETIVO_LABELS: Record<PrimeiroObjetivo, string> = {
  apresentar: "Me apresentar",
  trabalho: "Conversar sobre meu trabalho",
  reserva: "Fazer uma reserva",
  informacoes: "Pedir informações",
  reuniao: "Participar de uma reunião",
  entrevista: "Fazer uma entrevista",
  hobbies: "Falar sobre meus hobbies",
  podcast: "Entender um podcast",
  viajar: "Viajar sem depender de tradução",
};
export const OBJETIVO_LIST = Object.keys(OBJETIVO_LABELS) as PrimeiroObjetivo[];

export type NivelOpcao =
  "iniciante" | "basico" | "intermediario" | "intermediario-avancado" | "avancado";

export const NIVEL_INFO: Record<
  NivelOpcao,
  { label: string; desc: string; tag: string; level: Level; confianca: 1 | 2 | 3 | 4 | 5 }
> = {
  iniciante: {
    label: "Iniciante",
    desc: "Conheço algumas palavras, mas quase não consigo formar frases.",
    tag: "A1",
    level: "A1",
    confianca: 1,
  },
  basico: {
    label: "Básico",
    desc: "Consigo falar frases simples sobre assuntos conhecidos.",
    tag: "A2",
    level: "A2",
    confianca: 2,
  },
  intermediario: {
    label: "Intermediário",
    desc: "Entendo bastante, mas travo ao falar.",
    tag: "B1",
    level: "B1",
    confianca: 3,
  },
  "intermediario-avancado": {
    label: "Intermediário avançado",
    desc: "Consigo conversar, mas com erros e pausas.",
    tag: "B2",
    level: "B2",
    confianca: 4,
  },
  avancado: {
    label: "Avançado",
    desc: "Consigo conversar sobre assuntos variados, mas quero ganhar naturalidade.",
    tag: "C1",
    level: "C1",
    confianca: 5,
  },
};
export const NIVEL_LIST = Object.keys(NIVEL_INFO) as NivelOpcao[];

export type Dificuldade =
  | "vergonha"
  | "frases"
  | "entendo-nao-respondo"
  | "esqueco"
  | "entender-nativos"
  | "pronuncia"
  | "trava-situacoes"
  | "nao-sei-estudar"
  | "rotina"
  | "literal"
  | "gramatica";

export const DIFICULDADE_INFO: Record<Dificuldade, { label: string; competencia: Competency }> = {
  vergonha: { label: "Tenho vergonha de falar", competencia: "confianca" },
  frases: { label: "Sei palavras, mas não consigo formar frases", competencia: "gramatica" },
  "entendo-nao-respondo": {
    label: "Entendo, mas não consigo responder",
    competencia: "conversacao",
  },
  esqueco: { label: "Esqueço o vocabulário", competencia: "vocabulario" },
  "entender-nativos": {
    label: "Tenho dificuldade para entender nativos",
    competencia: "compreensao",
  },
  pronuncia: { label: "Tenho dificuldade com pronúncia", competencia: "pronuncia" },
  "trava-situacoes": { label: "Fico travado em situações reais", competencia: "situacoes" },
  "nao-sei-estudar": { label: "Não sei o que estudar", competencia: "vocabulario" },
  rotina: { label: "Tenho dificuldade para manter uma rotina", competencia: "confianca" },
  literal: { label: "Falo de forma muito literal", competencia: "fluencia" },
  gramatica: { label: "Tenho dificuldade com gramática", competencia: "gramatica" },
};
export const DIFICULDADE_LIST = Object.keys(DIFICULDADE_INFO) as Dificuldade[];

export type Assunto =
  | "trabalho"
  | "negocios"
  | "tecnologia"
  | "viagens"
  | "esportes"
  | "musica"
  | "filmes"
  | "jogos"
  | "gastronomia"
  | "financas"
  | "saude"
  | "moda"
  | "cultura"
  | "noticias"
  | "relacionamentos"
  | "desenvolvimento-pessoal"
  | "outro";

export const ASSUNTO_LABELS: Record<Assunto, string> = {
  trabalho: "Trabalho",
  negocios: "Negócios",
  tecnologia: "Tecnologia",
  viagens: "Viagens",
  esportes: "Esportes",
  musica: "Música",
  filmes: "Filmes e séries",
  jogos: "Jogos",
  gastronomia: "Gastronomia",
  financas: "Finanças",
  saude: "Saúde",
  moda: "Moda",
  cultura: "Cultura",
  noticias: "Notícias",
  relacionamentos: "Relacionamentos",
  "desenvolvimento-pessoal": "Desenvolvimento pessoal",
  outro: "Outro assunto",
};
export const ASSUNTO_LIST = Object.keys(ASSUNTO_LABELS) as Assunto[];

export type CorrecaoPref =
  | "tempo-real"
  | "no-final"
  | "so-importantes"
  | "forma-natural"
  | "regra"
  | "exemplos"
  | "pontos-atencao";

export const CORRECAO_LABELS: Record<CorrecaoPref, string> = {
  "tempo-real": "Corrigir enquanto eu falo",
  "no-final": "Corrigir apenas no final",
  "so-importantes": "Corrigir somente erros importantes",
  "forma-natural": "Mostrar uma forma mais natural de dizer",
  regra: "Explicar a regra gramatical",
  exemplos: "Mostrar exemplos",
  "pontos-atencao": "Apenas destacar meus pontos de atenção",
};
export const CORRECAO_LIST = Object.keys(CORRECAO_LABELS) as CorrecaoPref[];

export const TEMPO_DIARIO_OPTIONS = [5, 10, 15, 21, 30] as const;
export type TempoDiario = (typeof TEMPO_DIARIO_OPTIONS)[number];

export const PRAZO_PRESETS = [
  { label: "30 dias", dias: 30 },
  { label: "60 dias", dias: 60 },
  { label: "3 meses", dias: 90 },
  { label: "6 meses", dias: 180 },
] as const;

export type OnboardingAnswers = {
  nivel: NivelOpcao | null;
  motivos: Motivo[];
  primeiroObjetivo: PrimeiroObjetivo | null;
  dificuldades: Dificuldade[];
  assuntos: Assunto[];
  situacaoReal: string;
  tempoDiario: TempoDiario;
  correcaoPref: CorrecaoPref | null;
  metaPrincipal: string;
  prazo: string;
};

type State = { completed: boolean; skipped: boolean; answers: OnboardingAnswers };

const STORAGE_KEY = "hi.onboarding.v1";

export function emptyAnswers(): OnboardingAnswers {
  return {
    nivel: null,
    motivos: [],
    primeiroObjetivo: null,
    dificuldades: [],
    assuntos: [],
    situacaoReal: "",
    tempoDiario: 10,
    correcaoPref: null,
    metaPrincipal: "",
    prazo: "",
  };
}

function emptyState(): State {
  return { completed: false, skipped: false, answers: emptyAnswers() };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      completed: parsed.completed ?? false,
      skipped: parsed.skipped ?? false,
      answers: { ...emptyAnswers(), ...parsed.answers },
    };
  } catch {
    return emptyState();
  }
}

function persist(next: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / storage full — state still works in-memory for this session
  }
}

const SERVER_SNAPSHOT: State = emptyState();

let state: State | null = null;
const listeners = new Set<() => void>();

function ensureState(): State {
  if (state === null) state = loadState();
  return state;
}

function setState(next: State) {
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): State {
  return ensureState();
}

function getServerSnapshot(): State {
  return SERVER_SNAPSHOT;
}

export function completeOnboarding(answers: OnboardingAnswers) {
  setState({ completed: true, skipped: false, answers });
}

export function skipOnboarding() {
  const s = ensureState();
  setState({ ...s, skipped: true });
}

export function resetOnboarding() {
  setState(emptyState());
}

export function useOnboardingStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
