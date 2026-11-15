import {
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  FolderKanban,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UserPlus,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * ESTRUTURA DA TRILHA — é este arquivo que define "o que a pessoa aprende e em que ordem".
 *
 * Trilha → Seções → Unidades → Palavras. Cada unidade vira automaticamente 5 atividades
 * (Descobrir → Reconhecer → Recordar → Aplicar → Checkpoint) com as lições prontas; veja
 * `trail.ts` para como isso é montado. Para mudar o conteúdo basta editar/adicionar
 * unidades e palavras aqui:
 *
 * - Mantenha 5 palavras por unidade (o "Pares" usa 4 e o checkpoint usa as 5).
 * - `example` precisa conter `en` exatamente (a lacuna do "Complete a conversa" nasce daí).
 *   Prefira exemplos em que a palavra NÃO é a última da frase.
 * - `ask` é a pergunta que a Hi faz no diálogo. Não repita a palavra-alvo nela.
 * - Não renomeie ids de unidade depois que houver usuários: o progresso salvo usa esses ids.
 */

export type CurriculumWord = {
  en: string;
  ipa: string;
  pt: string;
  example: string;
  examplePt: string;
  icon: LucideIcon;
  /** Fala da Hi no diálogo (a pessoa completa a resposta com a palavra). */
  ask: { en: string; pt: string };
};

export type CurriculumUnit = {
  /** Estável: é a chave do progresso salvo. */
  id: string;
  title: string;
  description: string;
  /** Rótulo do cenário mostrado no "Complete a conversa". */
  context: string;
  /** Baralho onde as palavras são salvas. Por padrão, o título da unidade. */
  deckName?: string;
  words: CurriculumWord[];
};

export type CurriculumSection = {
  id: string;
  title: string;
  /** Nível CEFR mostrado no seletor de seções (A1, A2…). */
  level: string;
  /** Sem unidades = "Em breve". */
  units: CurriculumUnit[];
};

export type Curriculum = {
  name: string;
  sections: CurriculumSection[];
};

export const CURRICULUM: Curriculum = {
  name: "Inglês profissional",
  sections: [
    {
      id: "fundamentos",
      title: "Fundamentos",
      level: "A1",
      units: [
        {
          id: "apresentar-se",
          title: "Apresentar-se e cumprimentar",
          description: "Aprenda as palavras para se apresentar e conhecer sua equipe.",
          context: "Primeiro dia no trabalho",
          words: [
            {
              en: "introduce",
              ipa: "/ˌɪn.trəˈduːs/",
              pt: "apresentar",
              example: "Let me introduce myself to the team.",
              examplePt: "Deixe-me me apresentar ao time.",
              icon: UserPlus,
              ask: {
                en: "Hi! I don't think we've met.",
                pt: "Oi! Acho que ainda não nos conhecemos.",
              },
            },
            {
              en: "colleague",
              ipa: "/ˈkɑː.liːɡ/",
              pt: "colega de trabalho",
              example: "She is my colleague from the sales team.",
              examplePt: "Ela é minha colega do time de vendas.",
              icon: Users,
              ask: { en: "Who is Maria?", pt: "Quem é a Maria?" },
            },
            {
              en: "manager",
              ipa: "/ˈmæn.ɪ.dʒɚ/",
              pt: "gerente",
              example: "I report to my manager, Carlos.",
              examplePt: "Eu respondo ao meu gerente, Carlos.",
              icon: UserCheck,
              ask: { en: "Who do you report to?", pt: "Para quem você responde?" },
            },
            {
              en: "team",
              ipa: "/tiːm/",
              pt: "equipe",
              example: "I work with a small team in London.",
              examplePt: "Eu trabalho com uma pequena equipe em Londres.",
              icon: UserRound,
              ask: { en: "Do you work alone?", pt: "Você trabalha sozinho?" },
            },
            {
              en: "meeting",
              ipa: "/ˈmiː.tɪŋ/",
              pt: "reunião",
              example: "We have a meeting at ten.",
              examplePt: "Temos uma reunião às dez.",
              icon: CalendarClock,
              ask: { en: "What's on the schedule today?", pt: "O que temos na agenda hoje?" },
            },
          ],
        },
        {
          id: "apresentacoes-profissionais",
          title: "Apresentações profissionais",
          description: "Aprenda a se apresentar e falar sobre o seu trabalho.",
          context: "Apresentando seu trabalho",
          words: [
            {
              en: "role",
              ipa: "/roʊl/",
              pt: "função",
              example: "My role is to manage our social media.",
              examplePt: "Minha função é cuidar das nossas redes sociais.",
              icon: Briefcase,
              ask: { en: "What do you do here?", pt: "O que você faz aqui?" },
            },
            {
              en: "company",
              ipa: "/ˈkʌm.pə.ni/",
              pt: "empresa",
              example: "I work for a technology company.",
              examplePt: "Eu trabalho em uma empresa de tecnologia.",
              icon: Building2,
              ask: { en: "Where do you work?", pt: "Onde você trabalha?" },
            },
            {
              en: "project",
              ipa: "/ˈprɑː.dʒekt/",
              pt: "projeto",
              example: "I am leading a new project this year.",
              examplePt: "Estou liderando um novo projeto este ano.",
              icon: FolderKanban,
              ask: { en: "What are you working on?", pt: "No que você está trabalhando?" },
            },
            {
              en: "responsible",
              ipa: "/rɪˈspɑːn.sə.bəl/",
              pt: "responsável",
              example: "I am responsible for customer support.",
              examplePt: "Sou responsável pelo suporte ao cliente.",
              icon: ShieldCheck,
              ask: { en: "What are you in charge of?", pt: "Pelo que você é encarregado?" },
            },
            {
              en: "background",
              ipa: "/ˈbæk.ɡraʊnd/",
              pt: "formação e trajetória",
              example: "My background is in finance.",
              examplePt: "Minha formação é em finanças.",
              icon: GraduationCap,
              ask: { en: "What did you study?", pt: "O que você estudou?" },
            },
          ],
        },
        {
          id: "entrevista-simples",
          title: "Entrevista simples",
          description: "Prepare as palavras que mais aparecem em uma entrevista de emprego.",
          context: "Entrevista de emprego",
          deckName: "Entrevista de emprego",
          words: [
            {
              en: "experience",
              ipa: "/ɪkˈspɪr.i.əns/",
              pt: "experiência profissional",
              example: "I have two years of experience in marketing.",
              examplePt: "Tenho dois anos de experiência em marketing.",
              icon: Briefcase,
              ask: {
                en: "How long have you worked in marketing?",
                pt: "Há quanto tempo você trabalha com marketing?",
              },
            },
            {
              en: "skills",
              ipa: "/skɪlz/",
              pt: "habilidades",
              example: "I have strong communication skills.",
              examplePt: "Tenho boas habilidades de comunicação.",
              icon: Sparkles,
              ask: { en: "What are you good at?", pt: "Em que você é bom?" },
            },
            {
              en: "available",
              ipa: "/əˈveɪ.lə.bəl/",
              pt: "disponível",
              example: "I am available for an interview.",
              examplePt: "Estou disponível para uma entrevista.",
              icon: Clock,
              ask: { en: "Can we talk this week?", pt: "Podemos conversar esta semana?" },
            },
            {
              en: "position",
              ipa: "/pəˈzɪʃ.ən/",
              pt: "vaga",
              example: "I'd like to apply for the position.",
              examplePt: "Eu gostaria de me candidatar à vaga.",
              icon: Target,
              ask: { en: "Why are you here today?", pt: "Por que você está aqui hoje?" },
            },
            {
              en: "deadline",
              ipa: "/ˈded.laɪn/",
              pt: "prazo final",
              example: "We need to meet the deadline.",
              examplePt: "Precisamos cumprir o prazo.",
              icon: CalendarDays,
              ask: {
                en: "When does the project need to be done?",
                pt: "Quando o projeto precisa ficar pronto?",
              },
            },
          ],
        },
      ],
    },
    // Seção sem unidades aparece como "Bloqueada · em breve".
    { id: "dia-a-dia", title: "Conversas do dia a dia", level: "A2", units: [] },
  ],
};
