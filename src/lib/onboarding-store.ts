import { useSyncExternalStore } from "react";
import type { CloudBinding } from "./cloud-sync";
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
  | "viajar"
  | "argumentar"
  | "apresentar-projeto"
  | "negociar"
  | "sem-roteiro"
  | "liderar-reunioes"
  | "escrita-formal";

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
  argumentar: "Defender minha opinião e discordar com respeito",
  "apresentar-projeto": "Apresentar um projeto",
  negociar: "Negociar acordos",
  "sem-roteiro": "Falar sem roteiro, com naturalidade",
  "liderar-reunioes": "Conduzir reuniões",
  "escrita-formal": "Escrever e-mails com o tom certo",
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

/** Nível do perfil → opção do onboarding (o C2 não tem opção própria e conta como Avançado). */
export function nivelOpcaoFor(level: Level): NivelOpcao {
  return NIVEL_LIST.find((n) => NIVEL_INFO[n].level === level) ?? "avancado";
}

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
  | "gramatica"
  | "naturalidade"
  | "registro";

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
  naturalidade: { label: "Quero soar mais natural", competencia: "fluencia" },
  registro: { label: "Quero adaptar o tom (formal e informal)", competencia: "fluencia" },
};
export const DIFICULDADE_LIST = Object.keys(DIFICULDADE_INFO) as Dificuldade[];

/**
 * Perguntas do onboarding adaptadas ao nível: quem está no A1 e quem está no C1 não têm os mesmos
 * objetivos, dificuldades nem o mesmo jeito de ser perguntado.
 */
export type LevelCopy = {
  objetivoTitle: string;
  objetivoSubtitle: string;
  objetivos: PrimeiroObjetivo[];
  dificuldadeTitle: string;
  dificuldades: Dificuldade[];
  assuntoTitle: string;
  situacaoPlaceholder: string;
  metaPlaceholder: string;
};

export const LEVEL_COPY: Record<NivelOpcao, LevelCopy> = {
  iniciante: {
    objetivoTitle: "O que você quer aprender a falar primeiro?",
    objetivoSubtitle: "Escolha uma situação simples. A gente começa por ela.",
    objetivos: ["apresentar", "informacoes", "reserva", "hobbies", "viajar"],
    dificuldadeTitle: "O que mais atrapalha você hoje?",
    dificuldades: ["vergonha", "frases", "esqueco", "pronuncia", "nao-sei-estudar", "rotina"],
    assuntoTitle: "Sobre o que você quer aprender a conversar?",
    situacaoPlaceholder: "Ex: Vou viajar em dois meses e quero me virar no aeroporto.",
    metaPlaceholder: "Ex: Me apresentar e fazer perguntas simples.",
  },
  basico: {
    objetivoTitle: "O que você quer conseguir dizer primeiro?",
    objetivoSubtitle: "Escolha algo que você já tentou falar, mas ainda trava.",
    objetivos: ["trabalho", "informacoes", "reserva", "hobbies", "viajar", "apresentar"],
    dificuldadeTitle: "O que mais atrapalha sua evolução?",
    dificuldades: [
      "vergonha",
      "frases",
      "entendo-nao-respondo",
      "esqueco",
      "pronuncia",
      "trava-situacoes",
      "gramatica",
      "rotina",
    ],
    assuntoTitle: "Sobre o que você gostaria de conversar?",
    situacaoPlaceholder: "Ex: Vou fazer uma entrevista simples em inglês em um mês.",
    metaPlaceholder: "Ex: Conversar sobre meu trabalho sem travar.",
  },
  intermediario: {
    objetivoTitle: "O que você quer conseguir fazer primeiro?",
    objetivoSubtitle: "Escolha uma situação real em que você quer se sentir seguro.",
    objetivos: ["trabalho", "reuniao", "entrevista", "viajar", "podcast", "hobbies"],
    dificuldadeTitle: "O que mais atrapalha sua evolução?",
    dificuldades: [
      "entendo-nao-respondo",
      "trava-situacoes",
      "vergonha",
      "esqueco",
      "entender-nativos",
      "gramatica",
      "pronuncia",
      "rotina",
    ],
    assuntoTitle: "Sobre o que você gostaria de conversar?",
    situacaoPlaceholder: "Ex: Tenho uma reunião com um cliente estrangeiro em duas semanas.",
    metaPlaceholder: "Ex: Participar de reuniões em inglês.",
  },
  "intermediario-avancado": {
    objetivoTitle: "O que você quer melhorar primeiro?",
    objetivoSubtitle: "Escolha onde um inglês mais forte faria mais diferença para você.",
    objetivos: ["argumentar", "reuniao", "apresentar-projeto", "negociar", "entrevista", "podcast"],
    dificuldadeTitle: "O que ainda trava seu inglês?",
    dificuldades: [
      "trava-situacoes",
      "literal",
      "naturalidade",
      "entender-nativos",
      "gramatica",
      "esqueco",
      "pronuncia",
      "rotina",
    ],
    assuntoTitle: "Sobre o que você quer discutir em inglês?",
    situacaoPlaceholder: "Ex: Vou apresentar resultados para a diretoria em inglês.",
    metaPlaceholder: "Ex: Defender minhas ideias em reuniões sem perder o fio.",
  },
  avancado: {
    objetivoTitle: "O que você gostaria de praticar?",
    objetivoSubtitle: "Foque no que ainda não está natural. O básico você já domina.",
    objetivos: [
      "sem-roteiro",
      "liderar-reunioes",
      "negociar",
      "escrita-formal",
      "argumentar",
      "podcast",
    ],
    dificuldadeTitle: "O que ainda não está como você quer?",
    dificuldades: [
      "literal",
      "naturalidade",
      "registro",
      "entender-nativos",
      "pronuncia",
      "rotina",
    ],
    assuntoTitle: "Sobre o que você quer debater em inglês?",
    situacaoPlaceholder: "Ex: Vou liderar uma negociação com um fornecedor internacional.",
    metaPlaceholder: "Ex: Falar sem roteiro, com o tom certo para cada situação.",
  },
};

export function levelCopy(nivel: NivelOpcao | null): LevelCopy {
  return LEVEL_COPY[nivel ?? "intermediario"];
}

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
  /** Nível estimado pelo teste de nivelamento (`null` = não fez o teste). */
  nivelTeste: Level | null;
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

/**
 * O questionário é respondido uma única vez por conta: não existe "pular" nem "refazer". As
 * respostas formam o perfil da pessoa (e viajam com a conta, pelo Firestore, para outros aparelhos).
 */
type State = { completed: boolean; answers: OnboardingAnswers };

const STORAGE_KEY = "hi.onboarding.v1";

export function emptyAnswers(): OnboardingAnswers {
  return {
    nivel: null,
    nivelTeste: null,
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

/**
 * Aplica o nível às respostas e descarta o que não existe mais pra esse nível (ex.: o objetivo
 * "Falar sem roteiro" some se a pessoa voltou e mudou o nível pra Iniciante).
 */
export function adaptAnswersToLevel(
  answers: OnboardingAnswers,
  nivel: NivelOpcao,
): OnboardingAnswers {
  const copy = LEVEL_COPY[nivel];
  return {
    ...answers,
    nivel,
    primeiroObjetivo:
      answers.primeiroObjetivo && copy.objetivos.includes(answers.primeiroObjetivo)
        ? answers.primeiroObjetivo
        : null,
    dificuldades: answers.dificuldades.filter((d) => copy.dificuldades.includes(d)),
  };
}

function emptyState(): State {
  return { completed: false, answers: emptyAnswers() };
}

function normalize(parsed: Partial<State> | null | undefined): State {
  return {
    completed: parsed?.completed ?? false,
    answers: { ...emptyAnswers(), ...parsed?.answers },
  };
}

function loadState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw) as Partial<State>);
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

/** Conclui o questionário. Se já foi concluído, não faz nada: o perfil é único e não é recriado. */
export function completeOnboarding(answers: OnboardingAnswers) {
  if (ensureState().completed) return;
  setState({ completed: true, answers });
}

/** Ligação com o Firestore (users/{uid}/data/onboarding). Ver cloud-sync.ts. */
export const onboardingCloudBinding: CloudBinding<State> = {
  field: "onboarding",
  empty: emptyState,
  get: ensureState,
  replace: (remote) => setState(normalize(remote)),
  subscribe,
};

export function useOnboardingStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
