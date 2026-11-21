import type { Assunto } from "./onboarding-store";

/**
 * Missão de conversa (chat e voz). Quando a pessoa escolheu assuntos no onboarding, a missão e a
 * primeira fala do Hi saem de um deles, no nível da pessoa; sem assuntos, cai no tema padrão (fim de
 * semana).
 */
type OpeningLevel = "A1" | "A2" | "B1" | "B2" | "C1";

/** Primeira fala do Hi por nível: o A1/A2 recebem um modelo para repetir, o B2/C1 uma pergunta aberta. */
type Openings = Record<OpeningLevel, string>;

export type Mission = {
  /** Título exibido (pt-BR) e salvo no histórico. */
  title: string;
  /** Objetivo da conversa, em inglês, para o prompt do tutor. */
  goal: string;
  /** Primeira fala do Hi (inglês), já no nível da pessoa. */
  opening: string;
  /** Assunto do onboarding que originou a missão; `null` no tema padrão. */
  topic: Assunto | null;
};

/** C2 usa a abertura do C1 e um nível desconhecido usa a do B1 (o mesmo critério de `levelStyle`). */
export function openingLevel(level: string): OpeningLevel {
  if (level === "A1" || level === "A2" || level === "B1" || level === "B2" || level === "C1") {
    return level;
  }
  return level === "C2" ? "C1" : "B1";
}

const DEFAULT_GOAL = "tell how the learner's weekend was, using the simple past and connectors";

const DEFAULT_OPENINGS: Openings = {
  A1: 'Hi! How was your weekend? You can say: "It was good."',
  A2: 'Hey! How was your weekend? Did you go anywhere? Start with: "On Saturday, I..."',
  B1: "Hey! How was your weekend? Did you do anything fun?",
  B2: "Hey! How was your weekend? Anything worth telling, or was it a quiet one?",
  C1: "Hey! How was your weekend? Did anything happen worth telling me about, or did you finally manage to switch off?",
};

export function defaultMission(level: string = "B1"): Mission {
  return {
    title: "Fim de semana",
    goal: DEFAULT_GOAL,
    opening: DEFAULT_OPENINGS[openingLevel(level)],
    topic: null,
  };
}

/** Missão padrão no nível B1 (a abertura original). */
export const DEFAULT_MISSION: Mission = defaultMission("B1");

type TopicMission = { title: string; goal: string; opening: Openings };

export const TOPIC_MISSIONS: Record<Exclude<Assunto, "outro">, TopicMission> = {
  trabalho: {
    title: "Meu trabalho",
    goal: "describe the learner's job or studies and what a normal day looks like",
    opening: {
      A1: 'Hi! Let\'s talk about work. What is your job? You can say: "I am a teacher."',
      A2: 'Hey! Let\'s talk about work. What do you do? What is a normal day like? Start with: "I usually..."',
      B1: "Hey! Let's talk about work. What do you do, and what is a normal day like for you?",
      B2: "Hey! Let's talk about work. What does your job involve, and which part of it do you enjoy the most?",
      C1: "Hey! Let's talk about work. If you could change one thing about how your job is organized, what would it be, and why?",
    },
  },
  negocios: {
    title: "Negócios",
    goal: "talk about business ideas, projects or companies the learner is interested in",
    opening: {
      A1: 'Hi! Let\'s talk about business. Do you want a business? What is it? You can say: "I want a small shop."',
      A2: 'Hey! Let\'s talk about business. Do you have an idea for a business? What would you sell? Start with: "I want to sell..."',
      B1: "Hey! Let's talk about business. Do you have a business idea, or would you like to start one someday?",
      B2: "Hey! Let's talk about business. If you started a company, what problem would it solve, and who would your customers be?",
      C1: "Hey! Let's talk about business. Why do you think some new companies take off while most struggle to get off the ground?",
    },
  },
  tecnologia: {
    title: "Tecnologia",
    goal: "talk about the technology the learner uses or likes and what they use it for",
    opening: {
      A1: 'Hi! Let\'s talk about tech. What app do you use every day? You can say: "I use WhatsApp."',
      A2: 'Hey! Let\'s talk about tech. What app or gadget do you use every day? What do you do with it? Start with: "I use it to..."',
      B1: "Hey! Let's talk about tech. What app or gadget do you use the most, and why?",
      B2: "Hey! Let's talk about tech. Is there an app or gadget you couldn't live without, and has it changed how you work?",
      C1: "Hey! Let's talk about tech. Do you think we've become too dependent on our devices, or is that simply how progress goes?",
    },
  },
  viagens: {
    title: "Viagens",
    goal: "talk about places the learner has visited or wants to visit, and what they did or would do there",
    opening: {
      A1: 'Hi! Let\'s talk about travel. Do you like to travel? Where? You can say: "I like the beach."',
      A2: 'Hey! Let\'s talk about travel. Where did you go on your last trip? What did you do there? Start with: "I went to..."',
      B1: "Hey! Let's talk about travel. What is the best place you have ever visited, or where do you want to go next?",
      B2: "Hey! Let's talk about travel. What is the most memorable trip you have taken, and what made it stand out from the rest?",
      C1: "Hey! Let's talk about travel. Is there a difference between being a tourist and truly experiencing a place? Where do you draw the line?",
    },
  },
  esportes: {
    title: "Esportes",
    goal: "talk about the sports the learner plays or watches and why they like them",
    opening: {
      A1: 'Hi! Do you like sports? What sport do you like? You can say: "I like football."',
      A2: 'Hey! Do you play or watch any sport? Which one? How often? Start with: "I play... every week."',
      B1: "Hey! Do you play or watch any sports? Tell me about your favorite one!",
      B2: "Hey! Do you follow any sports? What do you enjoy about it, and has it taught you anything outside the game?",
      C1: "Hey! People say sport brings us together. Do you think that is true, or is it a bit of a cliché?",
    },
  },
  musica: {
    title: "Música",
    goal: "talk about the music the learner listens to, favorite artists and when they listen",
    opening: {
      A1: 'Hi! Let\'s talk about music. Do you like music? What music do you like? You can say: "I like pop."',
      A2: 'Hey! Let\'s talk about music. What music do you listen to? When do you listen to it? Start with: "I listen to... when I..."',
      B1: "Hey! Let's talk about music. What kind of music do you listen to the most these days?",
      B2: "Hey! Let's talk about music. Is there a song or an artist that takes you back to a specific time in your life?",
      C1: "Hey! Let's talk about music. Does the music you grew up with still shape your taste, or has your taste moved on completely?",
    },
  },
  filmes: {
    title: "Filmes e séries",
    goal: "talk about movies or series the learner watched recently and what they thought of them",
    opening: {
      A1: 'Hi! Do you like movies? What movie do you like? You can say: "I like comedies."',
      A2: 'Hey! What movie or series did you watch last week? Did you like it? Start with: "I watched..."',
      B1: "Hey! Have you watched any good movies or series lately? Tell me about it!",
      B2: "Hey! Have you watched anything recently that stuck with you? What was it about it that worked for you?",
      C1: "Hey! Have you seen anything lately that was overhyped, or something that deserved far more attention than it got?",
    },
  },
  jogos: {
    title: "Jogos",
    goal: "talk about the games the learner plays, how they play and why they enjoy them",
    opening: {
      A1: 'Hi! Do you play games? What game do you like? You can say: "I play FIFA."',
      A2: 'Hey! What game do you play these days? Do you play alone or with friends? Start with: "I play... with..."',
      B1: "Hey! Let's talk about games. What game are you playing these days?",
      B2: "Hey! Let's talk about games. What keeps you coming back to a game, and is there one you have played for years?",
      C1: "Hey! Let's talk about games. Do you think games can be considered a form of art, or is that a stretch?",
    },
  },
  gastronomia: {
    title: "Gastronomia",
    goal: "talk about food the learner likes, dishes they cook or places they eat",
    opening: {
      A1: 'Hi! Let\'s talk about food. What food do you like? You can say: "I like pizza."',
      A2: 'Hey! Let\'s talk about food. What did you eat today? Do you like to cook? Start with: "Today I ate..."',
      B1: "Hey! Let's talk about food. What is your favorite dish, and can you cook it?",
      B2: "Hey! Let's talk about food. What dish would you recommend to someone visiting your city, and how is it made?",
      C1: "Hey! Let's talk about food. Is cooking at home a dying art, or are we just cooking differently these days?",
    },
  },
  financas: {
    title: "Finanças",
    goal: "talk about money habits, saving, spending or something the learner is saving for",
    opening: {
      A1: 'Hi! Let\'s talk about money. Do you save money? You can say: "I save a little."',
      A2: 'Hey! Let\'s talk about money. Do you save money each month? What do you want to buy? Start with: "I want to save for..."',
      B1: "Hey! Let's talk about money. Do you have a habit to save or invest, or something you are saving for?",
      B2: "Hey! Let's talk about money. How do you decide what is worth spending on and what is not?",
      C1: "Hey! Let's talk about money. Should financial literacy be taught at school, or do people only learn by making mistakes?",
    },
  },
  saude: {
    title: "Saúde",
    goal: "talk about the learner's routine for staying healthy: exercise, food and sleep",
    opening: {
      A1: 'Hi! Let\'s talk about health. Do you exercise? You can say: "I walk every day."',
      A2: 'Hey! Let\'s talk about health. What do you do to stay healthy? Do you sleep well? Start with: "I try to..."',
      B1: "Hey! Let's talk about health. What do you do to stay healthy and feel good?",
      B2: "Hey! Let's talk about health. What is one healthy habit you have managed to stick to, and what made it work?",
      C1: "Hey! Let's talk about health. How do you strike a balance between being productive and actually resting?",
    },
  },
  moda: {
    title: "Moda",
    goal: "talk about the learner's style, favorite clothes and where they like to shop",
    opening: {
      A1: 'Hi! Let\'s talk about clothes. What do you like to wear? You can say: "I like jeans."',
      A2: 'Hey! Let\'s talk about fashion. What are you wearing today? Where do you buy clothes? Start with: "I usually buy..."',
      B1: "Hey! Let's talk about fashion. How would you describe your style?",
      B2: "Hey! Let's talk about fashion. Do you follow trends, or do you prefer to stick to your own style?",
      C1: "Hey! Let's talk about fashion. Does what we wear really say something about who we are, or is that overblown?",
    },
  },
  cultura: {
    title: "Cultura",
    goal: "talk about traditions, festivals, books, art or places in the learner's culture",
    opening: {
      A1: 'Hi! Let\'s talk about culture. What is a festival in your city? You can say: "We have a party."',
      A2: 'Hey! Let\'s talk about culture. What festival or tradition do you like? What do people do? Start with: "People..."',
      B1: "Hey! Let's talk about culture. What is a tradition or festival from your city that you love?",
      B2: "Hey! Let's talk about culture. What is something from your culture that people from abroad often misunderstand?",
      C1: "Hey! Let's talk about culture. How much of a country's tradition survives globalization, and does it matter if it doesn't?",
    },
  },
  noticias: {
    title: "Notícias",
    goal: "talk about news the learner read or heard recently and their opinion about it",
    opening: {
      A1: 'Hi! Let\'s talk about the news. Do you read the news? You can say: "I read news online."',
      A2: 'Hey! Let\'s talk about the news. Did you hear any news today? What was it about? Start with: "I heard that..."',
      B1: "Hey! Let's talk about the news. Did you read or hear anything interesting this week?",
      B2: "Hey! Let's talk about the news. Where do you get your news from, and how do you decide what to trust?",
      C1: "Hey! Let's talk about the news. Has the way we consume news made us better informed, or just more overwhelmed?",
    },
  },
  relacionamentos: {
    title: "Pessoas da minha vida",
    goal: "talk about family, friends and the people the learner spends time with",
    opening: {
      A1: 'Hi! Let\'s talk about people. Who do you live with? You can say: "I live with my mom."',
      A2: 'Hey! Let\'s talk about your family and friends. Who do you spend time with? What do you do together? Start with: "We often..."',
      B1: "Hey! Let's talk about the people in your life. Who do you spend the most time with, and what do you like to do together?",
      B2: "Hey! Let's talk about the people in your life. Who has influenced you the most, and how?",
      C1: "Hey! Let's talk about relationships. What do you think makes some friendships last for decades while others fade away?",
    },
  },
  "desenvolvimento-pessoal": {
    title: "Evoluir",
    goal: "talk about habits, goals and things the learner wants to learn or improve",
    opening: {
      A1: 'Hi! Let\'s talk about learning. What do you want to learn? You can say: "I want to learn English."',
      A2: 'Hey! Let\'s talk about goals. What do you want to learn this year? Why? Start with: "I want to learn... because..."',
      B1: "Hey! Let's talk about growing as a person. What is something new you want to learn or improve this year?",
      B2: "Hey! Let's talk about personal growth. What is a skill you have been putting off, and what is stopping you?",
      C1: "Hey! Let's talk about growth. Do people really change, or do we just get better at managing who we already are?",
    },
  },
};

/**
 * Escolhe a missão a partir dos assuntos da pessoa. Evita repetir os temas das últimas conversas
 * (`recentTitles`) enquanto houver outro assunto disponível.
 */
export function pickMission(
  assuntos: readonly Assunto[],
  recentTitles: readonly string[] = [],
  random: () => number = Math.random,
  level: string = "B1",
): Mission {
  const candidates = assuntos.filter((a): a is Exclude<Assunto, "outro"> => a in TOPIC_MISSIONS);
  if (candidates.length === 0) return level === "B1" ? DEFAULT_MISSION : defaultMission(level);

  const fresh = candidates.filter((a) => !recentTitles.includes(TOPIC_MISSIONS[a].title));
  const pool = fresh.length > 0 ? fresh : candidates;
  const topic = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] as Exclude<
    Assunto,
    "outro"
  >;
  const { opening, ...rest } = TOPIC_MISSIONS[topic];
  return { ...rest, opening: opening[openingLevel(level)], topic };
}
