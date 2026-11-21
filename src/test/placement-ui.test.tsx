import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlacementTest } from "@/components/PlacementTest";
import {
  PLACEMENT_BANK,
  startPlacement,
  currentQuestion,
  answerPlacement,
} from "@/lib/placement-test";
import type { PlacementState } from "@/lib/placement-test";

afterEach(cleanup);

/** Acha o texto da opção certa da pergunta que está na tela (pelo enunciado). */
function correctOptionFor(prompt: string) {
  const question = PLACEMENT_BANK.find((q) => q.prompt === prompt)!;
  return question.options[question.correct];
}

function currentPrompt(): string {
  const prompts = PLACEMENT_BANK.map((q) => q.prompt);
  const found = prompts.find((p) => screen.queryByText(p));
  if (!found) throw new Error("nenhuma pergunta na tela");
  return found;
}

describe("<PlacementTest />", () => {
  it("o teste explica e não oferece como pular", () => {
    render(<PlacementTest declared="B1" onFinish={vi.fn()} />);
    expect(screen.getByText("Vamos confirmar seu nível?")).toBeInTheDocument();
    expect(screen.getByText("Fazer o teste")).toBeInTheDocument();
    expect(screen.queryByText(/usar o nível que escolhi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pular/i)).not.toBeInTheDocument();
  });

  it("começa no nível escolhido, mostra 'Não sei' e só libera 'Responder' depois de marcar", () => {
    render(<PlacementTest declared="C1" onFinish={vi.fn()} />);
    fireEvent.click(screen.getByText("Fazer o teste"));

    const state = currentQuestion(startPlacement("C1"))!;
    expect(screen.getByText(state.prompt)).toBeInTheDocument();
    expect(screen.getByText("Não sei")).toBeInTheDocument();
    expect(screen.getByText("Responder")).toBeDisabled();
    fireEvent.click(screen.getByText("Não sei"));
    expect(screen.getByText("Responder")).toBeEnabled();
  });

  it("quem acerta tudo no B1 termina no B1 e escolhe começar nele", () => {
    const onFinish = vi.fn();
    render(<PlacementTest declared="B1" onFinish={onFinish} />);
    fireEvent.click(screen.getByText("Fazer o teste"));

    // Simula quem sabe até o B1: acerta A1–B1 e erra B2+. Replica o algoritmo com o estado puro
    // para saber, a cada pergunta, qual clicar.
    let model: PlacementState = startPlacement("B1");
    while (!model.placed) {
      const prompt = currentPrompt();
      const question = PLACEMENT_BANK.find((q) => q.prompt === prompt)!;
      const knows = ["A1", "A2", "B1"].includes(question.level);
      const wrong = question.options.find((_, i) => i !== question.correct)!;
      fireEvent.click(screen.getByText(knows ? correctOptionFor(prompt) : wrong));
      fireEvent.click(screen.getByText("Responder"));
      model = answerPlacement(model, knows);
    }

    expect(model.placed).toBe("B1");
    expect(screen.getByText("Seu nível estimado")).toBeInTheDocument();
    expect(screen.getByText(/É o mesmo nível que você escolheu/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Começar no B1"));
    expect(onFinish).toHaveBeenCalledWith({ level: "B1", estimated: "B1" });
  });

  it("quando o teste discorda, oferece o estimado e deixa manter o escolhido", () => {
    const onFinish = vi.fn();
    render(<PlacementTest declared="B2" onFinish={onFinish} />);
    fireEvent.click(screen.getByText("Fazer o teste"));

    // "Não sei" em tudo: do B2 desce até o A1.
    for (let i = 0; i < 10 && !screen.queryByText("Seu nível estimado"); i++) {
      fireEvent.click(screen.getByText("Não sei"));
      fireEvent.click(screen.getByText("Responder"));
    }

    expect(screen.getByText("Seu nível estimado")).toBeInTheDocument();
    expect(screen.getByText(/Você escolheu B2, mas suas respostas indicam A1/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Manter B2"));
    expect(onFinish).toHaveBeenCalledWith({ level: "B2", estimated: "A1" });
  });
});
