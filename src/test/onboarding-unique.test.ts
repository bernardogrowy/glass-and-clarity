import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyAnswers } from "@/lib/onboarding-store";

/** O perfil é único por conta: o questionário não é pulado nem refeito. */
describe("questionário inicial único", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("não existem mais as ações de pular e de refazer", async () => {
    const store = await import("@/lib/onboarding-store");
    expect(store).not.toHaveProperty("skipOnboarding");
    expect(store).not.toHaveProperty("resetOnboarding");
  });

  it("começa não concluído e o estado não tem mais 'skipped'", async () => {
    const { onboardingCloudBinding } = await import("@/lib/onboarding-store");
    const state = onboardingCloudBinding.get();
    expect(state.completed).toBe(false);
    expect(state).not.toHaveProperty("skipped");
  });

  it("concluir grava as respostas; concluir de novo não sobrescreve", async () => {
    const { completeOnboarding, onboardingCloudBinding } = await import("@/lib/onboarding-store");
    completeOnboarding({ ...emptyAnswers(), nivel: "basico", metaPrincipal: "Primeira meta" });
    completeOnboarding({ ...emptyAnswers(), nivel: "avancado", metaPrincipal: "Outra meta" });

    const state = onboardingCloudBinding.get();
    expect(state.completed).toBe(true);
    expect(state.answers.nivel).toBe("basico");
    expect(state.answers.metaPrincipal).toBe("Primeira meta");

    const saved = JSON.parse(window.localStorage.getItem("hi.onboarding.v1") ?? "{}");
    expect(saved.answers.metaPrincipal).toBe("Primeira meta");
  });

  it("quem tinha pulado antes (dado antigo com skipped) volta a precisar responder", async () => {
    window.localStorage.setItem(
      "hi.onboarding.v1",
      JSON.stringify({ completed: false, skipped: true, answers: emptyAnswers() }),
    );
    const { onboardingCloudBinding } = await import("@/lib/onboarding-store");
    const state = onboardingCloudBinding.get();
    expect(state.completed).toBe(false);
    expect(state).not.toHaveProperty("skipped");
  });

  it("o que vem da nuvem de uma conta já concluída é respeitado (outro aparelho)", async () => {
    const { onboardingCloudBinding } = await import("@/lib/onboarding-store");
    onboardingCloudBinding.replace({
      completed: true,
      answers: { ...emptyAnswers(), nivel: "intermediario" },
    });
    expect(onboardingCloudBinding.get().completed).toBe(true);
    expect(onboardingCloudBinding.get().answers.nivel).toBe("intermediario");
  });
});
