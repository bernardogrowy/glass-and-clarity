import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { completeOnboarding, emptyAnswers, onboardingCloudBinding } from "@/lib/onboarding-store";
import { Route } from "@/routes/perfil";

function openQuestionnaire() {
  const Perfil = Route.options.component!;
  render(<Perfil />);
  fireEvent.click(screen.getByText("Questionário inicial"));
}

describe("perfil: questionário inicial", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
    act(() => onboardingCloudBinding.replace(onboardingCloudBinding.empty()));
  });
  afterEach(cleanup);

  it("quem já respondeu vê as respostas, sem 'Refazer questionário'", () => {
    act(() =>
      completeOnboarding({ ...emptyAnswers(), nivel: "intermediario", motivos: ["viajar"] }),
    );
    openQuestionnaire();

    expect(screen.getByText("Viajar")).toBeInTheDocument();
    expect(screen.getByText(/respondido uma única vez/)).toBeInTheDocument();
    expect(screen.queryByText(/Refazer/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Responder agora")).not.toBeInTheDocument();
  });

  it("quem ainda não respondeu só tem 'Responder agora', que leva ao questionário sem apagar nada", () => {
    openQuestionnaire();
    expect(screen.getByText(/ainda não respondeu/)).toBeInTheDocument();
    expect(screen.queryByText(/Refazer/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Responder agora"));
    expect(navigate).toHaveBeenCalledWith({ to: "/onboarding" });
  });
});
