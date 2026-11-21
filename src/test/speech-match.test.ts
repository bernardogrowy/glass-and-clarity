import { describe, expect, it } from "vitest";
import { SPEECH_PASS_RATIO, normalizeWords, speechPassed, speechScore } from "@/lib/speech-match";

describe("avaliação da fala", () => {
  it("ignora maiúsculas, pontuação e apóstrofos", () => {
    expect(normalizeWords("Hi, I'm Carla — from support!")).toEqual([
      "hi",
      "im",
      "carla",
      "from",
      "support",
    ]);
    expect(speechScore("Hi, I'm Carla.", "hi im carla")).toBe(1);
  });

  it("a fala igual passa e a fala vazia ou de outra frase não", () => {
    const target = "I just joined the team this week.";
    expect(speechPassed(target, "I just joined the team this week")).toBe(true);
    expect(speechPassed(target, "")).toBe(false);
    expect(speechPassed(target, "good morning everyone")).toBe(false);
  });

  it("tolera uma palavra errada, mas não metade da frase", () => {
    const target = "Looking forward to working with you all";
    expect(speechPassed(target, "looking forward to working with you")).toBe(true);
    expect(speechPassed(target, "looking forward")).toBe(false);
    expect(SPEECH_PASS_RATIO).toBeGreaterThan(0.5);
  });

  it("não conta a mesma palavra falada uma vez só duas vezes", () => {
    // "the" aparece 2x na frase, mas só 1x na fala.
    expect(speechScore("the team and the manager", "the")).toBeCloseTo(0.2);
  });
});
