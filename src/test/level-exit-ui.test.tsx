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

import { buildLevelExitTest, daySeed } from "@/lib/level-exit-test";
import { profileCloudBinding, updateProfile } from "@/lib/profile-store";
import { getLevelExit, trailCloudBinding } from "@/lib/trail-store";
import { Route } from "@/routes/teste-de-nivel";

function renderTest() {
  const Page = Route.options.component!;
  return render(<Page />);
}

function setLevel(level: "A1" | "A2" | "B1" | "B2" | "C1") {
  act(() => updateProfile({ name: "T", level, avatarColor: "#000", avatarExpression: "duvida" }));
}

/** Responde às 10 perguntas: `right(i)` diz se a pergunta `i` é respondida certo. */
function answerAll(level: string, right: (i: number) => boolean) {
  const questions = buildLevelExitTest(level, daySeed(Date.now()));
  questions.forEach((q, i) => {
    const radios = screen.getAllByRole("radio");
    const wrong = [...radios.keys()].find((k) => k !== q.correct && k < q.options.length)!;
    fireEvent.click(radios[right(i) ? q.correct : wrong]!);
    fireEvent.click(screen.getByText(i === questions.length - 1 ? "Ver resultado" : "Responder"));
  });
}

describe("tela do teste para avançar de nível", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
    act(() => {
      trailCloudBinding.replace(trailCloudBinding.empty());
      profileCloudBinding.replace(profileCloudBinding.empty());
    });
  });
  afterEach(cleanup);

  it("explica as regras e começa pelo botão", () => {
    setLevel("B1");
    renderTest();
    expect(screen.getByText("Você já domina o B1?")).toBeInTheDocument();
    expect(screen.getByText(/segue direto para o B2/)).toBeInTheDocument();
    expect(screen.getByText(/Só uma tentativa por dia/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Começar o teste"));
    expect(screen.getByText("Pergunta 1 de 10")).toBeInTheDocument();
    // 'Responder' só libera depois de marcar uma opção.
    expect(screen.getByText("Responder")).toBeDisabled();
    expect(screen.getByText("Não sei")).toBeInTheDocument();
  });

  it("acertando tudo: o perfil sobe para o próximo nível e o resultado diz isso", () => {
    setLevel("B1");
    renderTest();
    fireEvent.click(screen.getByText("Começar o teste"));
    answerAll("B1", () => true);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Você avançou para o B2!")).toBeInTheDocument();
    expect(profileCloudBinding.get().level).toBe("B2");
    expect(getLevelExit(trailCloudBinding.get(), "B1")?.passedAt).toBeDefined();
  });

  it("errando muito: o nível não muda, mostra o que revisar e não deixa tentar de novo hoje", () => {
    setLevel("A2");
    const { unmount } = renderTest();
    fireEvent.click(screen.getByText("Começar o teste"));
    answerAll("A2", () => false);

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("Ainda não foi desta vez")).toBeInTheDocument();
    expect(screen.getByText("Vale revisar:")).toBeInTheDocument();
    expect(profileCloudBinding.get().level).toBe("A2");

    unmount();
    renderTest();
    expect(screen.getByText(/Você já fez o teste hoje/)).toBeInTheDocument();
    expect(screen.queryByText("Começar o teste")).not.toBeInTheDocument();
  });

  it("recarregar no meio do teste gasta a tentativa (não dá para rever as perguntas)", () => {
    setLevel("B1");
    const { unmount } = renderTest();
    fireEvent.click(screen.getByText("Começar o teste"));
    expect(screen.getByText("Pergunta 1 de 10")).toBeInTheDocument();
    unmount();
    renderTest();
    expect(screen.getByText(/Você já fez o teste hoje/)).toBeInTheDocument();
  });

  it("no último nível não há o que testar e volta para a trilha", () => {
    setLevel("C1");
    renderTest();
    expect(navigate).toHaveBeenCalledWith({ to: "/trilha", replace: true });
  });
});
