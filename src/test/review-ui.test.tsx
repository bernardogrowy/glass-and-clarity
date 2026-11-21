import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { UNITS } from "@/lib/trail";
import { enrollWords, reviewCloudBinding } from "@/lib/review-store";
import { REVIEW_SESSION_SIZE } from "@/lib/review-session";
import { streakCloudBinding } from "@/lib/streak-store";
import { Route } from "@/routes/revisao";

const DAY = 86_400_000;

function renderPage() {
  const Page = Route.options.component!;
  return render(<Page />);
}

/** Põe as palavras de entrada/aplicar de `count` unidades na agenda, vencidas há tempo. */
function enrollOld(count: number) {
  act(() => {
    for (const unit of UNITS.slice(0, count)) {
      const ids = unit.activities
        .filter((a) => a.skill === "entrada" || a.skill === "aplicar")
        .flatMap((a) => a.wordIds);
      enrollWords(ids, Date.now() - 40 * DAY);
    }
  });
}

/** Marca a primeira opção e responde (pode acertar ou errar). Devolve se acertou. */
function answerFirstOption(): boolean {
  fireEvent.click(screen.getAllByRole("radio")[0]!);
  fireEvent.click(screen.getByText("Responder"));
  return screen.queryByText("Isso mesmo!") !== null;
}

describe("tela da revisão do dia", () => {
  beforeEach(() => {
    window.localStorage.clear();
    act(() => {
      reviewCloudBinding.replace(reviewCloudBinding.empty());
      streakCloudBinding.replace(streakCloudBinding.empty());
    });
  });
  afterEach(cleanup);

  it("sem nada na agenda explica como as palavras chegam aqui", () => {
    renderPage();
    expect(screen.getByText("Nada para revisar agora")).toBeInTheDocument();
    expect(screen.getByText(/entram aqui sozinhas/)).toBeInTheDocument();
    expect(screen.queryByText("Começar a revisão")).not.toBeInTheDocument();
  });

  it("agenda em dia (nada vencido) mostra o total e não oferece revisão", () => {
    act(() => enrollWords(["deadline"], Date.now()));
    renderPage();
    expect(screen.getByText("Nada para revisar agora")).toBeInTheDocument();
    expect(screen.getByText(/1 palavra na sua agenda/)).toBeInTheDocument();
  });

  it("com palavras vencidas oferece a revisão e faz uma sessão inteira com resposta na hora", () => {
    enrollOld(3);
    renderPage();
    expect(screen.getByText(/palavras para revisar/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Começar a revisão"));

    let hits = 0;
    for (let i = 0; i < REVIEW_SESSION_SIZE; i++) {
      expect(screen.getByText(`Pergunta ${i + 1} de ${REVIEW_SESSION_SIZE}`)).toBeInTheDocument();
      // 'Responder' só libera depois de marcar.
      expect(screen.getByText("Responder")).toBeDisabled();
      if (answerFirstOption()) hits += 1;
      // Feedback na hora e opções travadas até continuar.
      expect(screen.getByRole("status")).toBeInTheDocument();
      fireEvent.click(
        screen.getByText(i === REVIEW_SESSION_SIZE - 1 ? "Ver resultado" : "Continuar"),
      );
    }
    expect(screen.getByText(`${hits} de ${REVIEW_SESSION_SIZE} certas`)).toBeInTheDocument();

    // Cada resposta foi gravada na agenda: acertou = caixa 1, errou = caixa 0 com recaída.
    const items = Object.values(reviewCloudBinding.get().items);
    expect(items.filter((i) => i.reviews === 1)).toHaveLength(REVIEW_SESSION_SIZE);
    expect(items.filter((i) => i.box === 1)).toHaveLength(hits);
    expect(items.filter((i) => i.lapses === 1)).toHaveLength(REVIEW_SESSION_SIZE - hits);
    // Conta como dia de estudo (sequência).
    expect(streakCloudBinding.get().current).toBe(1);
  });

  it("sair no meio não perde o que já foi respondido", () => {
    enrollOld(2);
    const { unmount } = renderPage();
    fireEvent.click(screen.getByText("Começar a revisão"));
    answerFirstOption();
    unmount();
    const reviewed = Object.values(reviewCloudBinding.get().items).filter((i) => i.reviews === 1);
    expect(reviewed).toHaveLength(1);
  });

  it("depois da sessão, se ainda há palavras vencidas, oferece continuar", () => {
    enrollOld(6); // bem mais que 10 palavras
    renderPage();
    fireEvent.click(screen.getByText("Começar a revisão"));
    for (let i = 0; i < REVIEW_SESSION_SIZE; i++) {
      answerFirstOption();
      fireEvent.click(
        screen.getByText(i === REVIEW_SESSION_SIZE - 1 ? "Ver resultado" : "Continuar"),
      );
    }
    expect(screen.getByText(/Ainda há \d+ para revisar/)).toBeInTheDocument();
  });
});
