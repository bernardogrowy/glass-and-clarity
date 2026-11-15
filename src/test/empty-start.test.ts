import { beforeEach, describe, expect, it, vi } from "vitest";

describe("começa sem dados fictícios", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("flashcards: nenhum baralho nem card de exemplo", async () => {
    const { flashcardsCloudBinding } = await import("@/lib/flashcards-store");
    const state = flashcardsCloudBinding.get();
    expect(state.decks).toEqual([]);
    expect(state.cards).toEqual([]);
  });

  it("perfil: sem nome fictício", async () => {
    const { profileCloudBinding } = await import("@/lib/profile-store");
    expect(profileCloudBinding.get().name).toBe("");
  });

  it("streak, progresso, lições, chat e onboarding começam zerados", async () => {
    const streak = (await import("@/lib/streak-store")).streakCloudBinding.get();
    expect(streak).toMatchObject({ current: 0, longest: 0, activeDates: [] });

    const progress = (await import("@/lib/progress-store")).progressCloudBinding.get();
    expect(progress).toEqual({ goals: [], sessions: [] });

    const lessons = (await import("@/lib/lesson-store")).lessonCloudBinding.get();
    expect(lessons).toMatchObject({ session: null, wordStages: {}, firstTryTotal: 0 });

    const chat = (await import("@/lib/chat-store")).chatCloudBinding.get();
    expect(chat.conversations).toEqual([]);

    const onboarding = (await import("@/lib/onboarding-store")).onboardingCloudBinding.get();
    expect(onboarding).toMatchObject({ completed: false, skipped: false });
  });

  it("sobra de dados antigos (baralho de exemplo salvo) some quando a conta é nova", async () => {
    window.localStorage.setItem(
      "hi.flashcards.v1",
      JSON.stringify({
        decks: [{ id: "d", name: "Fim de semana", tone: "bg-mint", createdAt: 1 }],
      }),
    );
    const { flashcardsCloudBinding } = await import("@/lib/flashcards-store");
    expect(flashcardsCloudBinding.get().decks).toHaveLength(1); // cache local antigo

    flashcardsCloudBinding.replace(flashcardsCloudBinding.empty()); // o que o cloud-sync faz em conta nova

    expect(flashcardsCloudBinding.get().decks).toEqual([]);
  });
});
