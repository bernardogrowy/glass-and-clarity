import { describe, expect, it } from "vitest";
import { ASSUNTO_LIST } from "@/lib/onboarding-store";
import {
  DEFAULT_MISSION,
  TOPIC_MISSIONS,
  defaultMission,
  openingLevel,
  pickMission,
} from "@/lib/mission-topics";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const allOpenings = () => [
  ...LEVELS.map((l) => ({ name: `padrão ${l}`, level: l, text: defaultMission(l).opening })),
  ...Object.entries(TOPIC_MISSIONS).flatMap(([topic, m]) =>
    LEVELS.map((l) => ({ name: `${topic} ${l}`, level: l, text: m.opening[l] })),
  ),
];

describe("pickMission", () => {
  it("sem assuntos (ou só 'outro') usa o tema padrão", () => {
    expect(pickMission([])).toBe(DEFAULT_MISSION);
    expect(pickMission(["outro"])).toBe(DEFAULT_MISSION);
  });

  it("a missão vem de um assunto escolhido", () => {
    const m = pickMission(["musica"]);
    expect(m.topic).toBe("musica");
    expect(m.title).toBe("Música");
    expect(m.opening).toMatch(/music/i);
  });

  it("evita repetir os temas recentes enquanto houver outro", () => {
    const m = pickMission(["musica", "jogos"], ["Música"], () => 0);
    expect(m.topic).toBe("jogos");
  });

  it("se todos os temas são recentes, repete em vez de cair no padrão", () => {
    expect(pickMission(["musica"], ["Música"]).topic).toBe("musica");
  });

  it("todo assunto do onboarding (exceto 'outro') tem missão", () => {
    for (const a of ASSUNTO_LIST.filter((x) => x !== "outro")) {
      expect(TOPIC_MISSIONS[a as keyof typeof TOPIC_MISSIONS]).toBeDefined();
    }
  });

  it("sem nível informado, a abertura é a do B1 (a original)", () => {
    expect(pickMission(["musica"]).opening).toBe(TOPIC_MISSIONS.musica.opening.B1);
    expect(DEFAULT_MISSION.opening).toBe(defaultMission("B1").opening);
  });
});

describe("abertura por nível", () => {
  it("cada nível recebe a sua abertura, todas diferentes entre si", () => {
    for (const level of LEVELS) {
      expect(pickMission(["musica"], [], () => 0, level).opening).toBe(
        TOPIC_MISSIONS.musica.opening[level],
      );
    }
    for (const [topic, m] of Object.entries(TOPIC_MISSIONS)) {
      expect(new Set(Object.values(m.opening)).size, topic).toBe(5);
    }
    expect(new Set(LEVELS.map((l) => defaultMission(l).opening)).size).toBe(5);
  });

  it("C2 usa a abertura do C1 e nível desconhecido usa a do B1", () => {
    expect(openingLevel("C2")).toBe("C1");
    expect(openingLevel("??")).toBe("B1");
    expect(pickMission(["jogos"], [], () => 0, "C2").opening).toBe(TOPIC_MISSIONS.jogos.opening.C1);
  });

  it("a missão padrão também muda com o nível", () => {
    expect(pickMission([], [], () => 0, "A1").opening).toBe(defaultMission("A1").opening);
    expect(defaultMission("C1").opening).not.toBe(defaultMission("A1").opening);
  });

  it("A1 e A2 trazem um modelo para a pessoa repetir; B2 e C1 não", () => {
    for (const { name, level, text } of allOpenings()) {
      const hasModel = /You can say: "|Start with: "/.test(text);
      if (level === "A1" || level === "A2") expect(hasModel, name).toBe(true);
      else expect(hasModel, name).toBe(false);
    }
  });

  it("no A1 cada frase tem no máximo 8 palavras", () => {
    for (const { name, text } of allOpenings().filter((o) => o.level === "A1")) {
      for (const sentence of text.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).length, `${name}: ${sentence}`).toBeLessThanOrEqual(8);
      }
    }
  });

  it("toda abertura é uma pergunta, em inglês, sem espaços sobrando", () => {
    for (const { name, text } of allOpenings()) {
      expect(text, name).toContain("?");
      expect(text, name).toBe(text.trim());
      expect(text, name).not.toMatch(/\s{2,}/);
    }
  });

  it("o B2 é mais elaborado que o A1 (mais palavras)", () => {
    const words = (t: string) => t.split(/\s+/).length;
    for (const [topic, m] of Object.entries(TOPIC_MISSIONS)) {
      expect(words(m.opening.B2), topic).toBeGreaterThan(14);
      expect(words(m.opening.C1), topic).toBeGreaterThan(14);
    }
  });
});
