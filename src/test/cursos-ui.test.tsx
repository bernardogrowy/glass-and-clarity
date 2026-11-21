import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A tela usa Link/useNavigate do roteador; aqui interessa só o conteúdo, então viram um <a> simples.
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { Route } from "@/routes/cursos";
import { ACTIVITIES, COURSES } from "@/lib/trail";
import { recordLessonResult, trailCloudBinding } from "@/lib/trail-store";

function renderCursos() {
  const Cursos = Route.options.component!;
  return render(<Cursos />);
}

/** Conclui as `n` primeiras atividades da trilha principal (o que libera os cursos). */
function completeMainActivities(n: number) {
  act(() => {
    for (const activity of ACTIVITIES.slice(0, n)) recordLessonResult(activity.id, 100);
  });
}

describe("tela de cursos extras", () => {
  beforeEach(() => {
    window.localStorage.clear();
    act(() => trailCloudBinding.replace(trailCloudBinding.empty()));
  });
  afterEach(cleanup);

  it("bloqueada: mostra o que falta, leva à trilha e não abre nenhum curso", () => {
    renderCursos();
    expect(screen.getByText(/Faltam 5 atividades para liberar/)).toBeInTheDocument();
    expect(screen.getByText("0 de 5 atividades da trilha")).toBeInTheDocument();
    expect(screen.getByText("Ir para a trilha").closest("a")).toHaveAttribute("href", "/trilha");
    // Prévia dos 7 cursos, sem botão de abrir.
    for (const course of COURSES) expect(screen.getByText(course.title)).toBeInTheDocument();
    expect(screen.queryByText("Começar")).not.toBeInTheDocument();
  });

  it("o contador acompanha a trilha e fala no singular quando falta 1", () => {
    renderCursos();
    completeMainActivities(3);
    expect(screen.getByText(/Faltam 2 atividades para liberar/)).toBeInTheDocument();
    completeMainActivities(4);
    expect(screen.getByText(/Faltam 1 atividade para liberar/)).toBeInTheDocument();
    expect(screen.getByText("4 de 5 atividades da trilha")).toBeInTheDocument();
  });

  it("ao concluir as 5 atividades, libera a lista e dá pra abrir um curso", () => {
    renderCursos();
    completeMainActivities(5);

    expect(screen.queryByText(/Faltam/)).not.toBeInTheDocument();
    for (const course of COURSES) expect(screen.getByText(course.title)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Viagem a trabalho"));
    expect(screen.getByText(/VT\.1 · Unidade 1/)).toBeInTheDocument();
    expect(screen.getByText("Aeroporto e embarque")).toBeInTheDocument();
    // Primeira atividade do curso aberta, as demais bloqueadas.
    expect(screen.getAllByText("Termine a etapa anterior").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Cursos"));
    expect(screen.getByText("Saúde e emergências")).toBeInTheDocument();
  });
});
