import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// O onboarding usa useNavigate; aqui só interessa a tela, então a navegação vira um espião.
const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

import {
  PLACEMENT_BANK,
  answerPlacement,
  currentQuestion,
  placementRank,
  startPlacement,
} from "@/lib/placement-test";
import type { Level } from "@/lib/profile-store";
import { completeOnboarding, emptyAnswers, onboardingCloudBinding } from "@/lib/onboarding-store";
import { Route } from "@/routes/onboarding";

function renderOnboarding() {
  const Onboarding = Route.options.component!;
  return render(<Onboarding />);
}

const next = () => fireEvent.click(screen.getByText("Continuar"));

/** Vai da primeira tela até o nivelamento escolhendo `nivelLabel`. */
function goToPlacement(nivelLabel: string) {
  next(); // idioma → nível
  fireEvent.click(screen.getByText(nivelLabel));
  next(); // nível → nivelamento
}

/** Faz o teste de nivelamento sabendo tudo até `target` (e nada acima) e começa no nível em que ele termina. */
function passPlacement(target: Level) {
  fireEvent.click(screen.getByText("Fazer o teste"));
  let model = startPlacement(target);
  while (!model.placed) {
    const q = currentQuestion(model)!;
    const bank = PLACEMENT_BANK.find((b) => b.prompt === q.prompt)!;
    const knows = placementRank(bank.level) <= placementRank(target);
    const wrong = bank.options.findIndex((_, i) => i !== bank.correct);
    fireEvent.click(screen.getByText(bank.options[knows ? bank.correct : wrong]));
    fireEvent.click(screen.getByText("Responder"));
    model = answerPlacement(model, knows);
  }
  expect(model.placed).toBe(target);
  fireEvent.click(screen.getByText(`Começar no ${target}`));
}

/** Marca a primeira opção da pergunta na tela (ignora Voltar e Continuar). */
function pickFirstOption() {
  const option = screen
    .getAllByRole("button")
    .find((b) => b.getAttribute("aria-label") !== "Voltar" && b.textContent !== "Continuar");
  fireEvent.click(option!);
}

describe("onboarding: nivelamento e perguntas por nível", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
    // O store guarda o estado em memória: volta ao "ainda não respondeu" a cada teste.
    act(() => onboardingCloudBinding.replace(onboardingCloudBinding.empty()));
  });
  afterEach(cleanup);

  it("depois de escolher o nível, oferece o teste, que é obrigatório", () => {
    renderOnboarding();
    goToPlacement("Intermediário avançado");
    expect(screen.getByText("Nivelamento")).toBeInTheDocument();
    expect(screen.getByText("Vamos confirmar seu nível?")).toBeInTheDocument();
    // Durante o nivelamento o "Continuar" do onboarding some: quem avança é o próprio teste.
    expect(screen.queryByText("Continuar")).not.toBeInTheDocument();
    expect(screen.queryByText(/usar o nível que escolhi/i)).not.toBeInTheDocument();
  });

  it("C1 vê 'O que você gostaria de praticar?' com objetivos avançados", () => {
    renderOnboarding();
    goToPlacement("Avançado");
    passPlacement("C1");

    // Pergunta 3 (o nivelamento não conta como pergunta): motivos.
    expect(screen.getByText("Pergunta 3 de 10")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Trabalhar"));
    next();

    expect(screen.getByText("Pergunta 4 de 10")).toBeInTheDocument();
    expect(screen.getByText("O que você gostaria de praticar?")).toBeInTheDocument();
    expect(screen.getByText("Falar sem roteiro, com naturalidade")).toBeInTheDocument();
    expect(screen.getByText("Conduzir reuniões")).toBeInTheDocument();
    expect(screen.queryByText("Me apresentar")).not.toBeInTheDocument();
  });

  it("A1 vê 'O que você quer aprender a falar primeiro?' com objetivos simples", () => {
    renderOnboarding();
    goToPlacement("Iniciante");
    passPlacement("A1");
    fireEvent.click(screen.getByText("Viajar"));
    next();

    expect(screen.getByText("O que você quer aprender a falar primeiro?")).toBeInTheDocument();
    expect(screen.getByText("Me apresentar")).toBeInTheDocument();
    expect(screen.getByText("Fazer uma reserva")).toBeInTheDocument();
    expect(screen.queryByText("Falar sem roteiro, com naturalidade")).not.toBeInTheDocument();
  });

  it("B2 vê 'O que você quer melhorar primeiro?'", () => {
    renderOnboarding();
    goToPlacement("Intermediário avançado");
    passPlacement("B2");
    fireEvent.click(screen.getByText("Trabalhar"));
    next();
    expect(screen.getByText("O que você quer melhorar primeiro?")).toBeInTheDocument();
    expect(screen.getByText("Negociar acordos")).toBeInTheDocument();
  });

  it("o teste muda o nível: quem escolheu C1 mas responde 'não sei' recebe o A1 e o onboarding segue com ele", () => {
    renderOnboarding();
    goToPlacement("Avançado");
    fireEvent.click(screen.getByText("Fazer o teste"));
    for (let i = 0; i < 10 && !screen.queryByText("Seu nível estimado"); i++) {
      fireEvent.click(screen.getByText("Não sei"));
      fireEvent.click(screen.getByText("Responder"));
    }
    expect(screen.getByText("A1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Começar no A1"));

    fireEvent.click(screen.getByText("Trabalhar"));
    next();
    // Já com as perguntas do nível A1.
    expect(screen.getByText("O que você quer aprender a falar primeiro?")).toBeInTheDocument();
  });

  it("voltar e trocar de nível troca as perguntas e descarta a escolha que não existe mais", () => {
    renderOnboarding();
    goToPlacement("Avançado");
    passPlacement("C1");
    fireEvent.click(screen.getByText("Trabalhar"));
    next();
    fireEvent.click(screen.getByText("Falar sem roteiro, com naturalidade"));

    // Volta até o nível (objetivo → motivos → nivelamento → nível), troca e segue de novo.
    const back = () => fireEvent.click(screen.getByLabelText("Voltar"));
    back();
    back();
    back();
    fireEvent.click(screen.getByText("Iniciante"));
    next();
    passPlacement("A1");
    next(); // motivos já tinha "Trabalhar"
    expect(screen.getByText("O que você quer aprender a falar primeiro?")).toBeInTheDocument();
    // A escolha antiga sumiu: o "Continuar" está bloqueado até escolher de novo.
    expect(screen.getByText("Continuar")).toBeDisabled();
  });

  it("não existe botão de pular em nenhuma etapa", () => {
    renderOnboarding();
    const seen: string[] = [];
    const check = () => {
      expect(screen.queryByText(/pular/i)).not.toBeInTheDocument();
      seen.push(screen.getByText(/Pergunta \d+ de 10|Nivelamento/).textContent ?? "");
    };
    check(); // idioma
    next();
    check(); // nível
    fireEvent.click(screen.getByText("Intermediário"));
    next();
    check(); // nivelamento
    fireEvent.click(screen.getByText("Fazer o teste"));
    expect(screen.queryByText(/pular/i)).not.toBeInTheDocument(); // durante o teste
    expect(seen).toHaveLength(3);
  });

  it("cada pergunta obrigatória trava o 'Continuar' até ser respondida", () => {
    renderOnboarding();
    next(); // idioma → nível
    expect(screen.getByText("Continuar")).toBeDisabled();
    fireEvent.click(screen.getByText("Básico"));
    expect(screen.getByText("Continuar")).toBeEnabled();
    next();
    fireEvent.click(screen.getByText("Fazer o teste"));
    for (let i = 0; i < 10 && !screen.queryByText("Seu nível estimado"); i++) {
      fireEvent.click(screen.getByText("Não sei"));
      fireEvent.click(screen.getByText("Responder"));
    }
    fireEvent.click(screen.getByText(/Começar no/));
    // motivos: sem escolher nada não avança
    expect(screen.getByText("Continuar")).toBeDisabled();
  });

  it("a 'situação real' não é opcional: sem texto, o 'Continuar' fica travado", () => {
    renderOnboarding();
    goToPlacement("Intermediário");
    passPlacement("B1");
    fireEvent.click(screen.getByText("Trabalhar"));
    next(); // motivos
    // objetivo, dificuldades e assuntos: marca a primeira opção de cada
    for (let i = 0; i < 3; i++) {
      pickFirstOption();
      next();
    }
    expect(screen.getByText(/situação real/i)).toBeInTheDocument();
    expect(screen.queryByText(/opcional/i)).not.toBeInTheDocument();
    expect(screen.getByText("Continuar")).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Reunião com cliente" } });
    expect(screen.getByText("Continuar")).toBeEnabled();
  });

  it("quem já concluiu não vê o questionário e volta pra Home (perfil único)", () => {
    act(() => completeOnboarding({ ...emptyAnswers(), nivel: "basico" }));
    const { container } = renderOnboarding();
    expect(container).toBeEmptyDOMElement();
    expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });
});
