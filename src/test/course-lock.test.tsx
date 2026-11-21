import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// As rotas de lição usam useNavigate; aqui só interessa para onde elas mandam a pessoa.
const navigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

import { lessonCloudBinding } from "@/lib/lesson-store";
import { ACTIVITIES, COURSE_ACTIVITIES } from "@/lib/trail";
import { isLessonLocked, recordLessonResult, trailCloudBinding } from "@/lib/trail-store";
import { Route as EscolhaRoute } from "@/routes/licao/$id/escolha";
import { Route as StartRoute } from "@/routes/licao/$id/index";
import { Route as ResumoRoute } from "@/routes/licao/$id/resumo";

const courseLesson = COURSE_ACTIVITIES[0].lessonId;
const mainLesson = ACTIVITIES[0].lessonId;

/** Renderiza a rota de lição com o id da URL fingido. */
function renderLesson(
  route: typeof StartRoute | typeof ResumoRoute | typeof EscolhaRoute,
  id: string,
) {
  vi.spyOn(route, "useParams").mockReturnValue({ id } as never);
  const Component = route.options.component!;
  return render(<Component />);
}

function completeMainActivities(n: number) {
  act(() => {
    for (const activity of ACTIVITIES.slice(0, n)) recordLessonResult(activity.id, 100);
  });
}

describe("bloqueio dos cursos extras pela URL", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
    act(() => {
      trailCloudBinding.replace(trailCloudBinding.empty());
      lessonCloudBinding.replace(lessonCloudBinding.empty());
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("isLessonLocked: só lições de curso, e só até liberar", () => {
    const empty = trailCloudBinding.empty();
    expect(isLessonLocked(empty, courseLesson)).toBe(true);
    expect(isLessonLocked(empty, mainLesson)).toBe(false);
    expect(isLessonLocked(empty, "id-que-nao-existe")).toBe(false);
    completeMainActivities(5);
    expect(isLessonLocked(trailCloudBinding.get(), courseLesson)).toBe(false);
  });

  it("abrir /licao/<curso> bloqueado manda para /cursos e não inicia a lição", () => {
    renderLesson(StartRoute, courseLesson);
    expect(navigate).toHaveBeenCalledWith({ to: "/cursos", replace: true });
    expect(lessonCloudBinding.get().session).toBeNull();
  });

  it("uma etapa digitada na URL também volta para /cursos, sem criar sessão", () => {
    renderLesson(EscolhaRoute, courseLesson);
    expect(navigate).toHaveBeenCalledWith({ to: "/cursos", replace: true });
    expect(lessonCloudBinding.get().session).toBeNull();
  });

  it("o resumo de um curso bloqueado não conclui nada nem registra progresso", () => {
    const { container } = renderLesson(ResumoRoute, courseLesson);
    expect(navigate).toHaveBeenCalledWith({ to: "/cursos", replace: true });
    expect(container).toBeEmptyDOMElement();
    expect(recordLessonResult(courseLesson, 100)).toBeNull();
    expect(trailCloudBinding.get().completed[COURSE_ACTIVITIES[0].id]).toBeUndefined();
  });

  it("a trilha principal continua abrindo normalmente", () => {
    renderLesson(StartRoute, mainLesson);
    expect(navigate).not.toHaveBeenCalledWith({ to: "/cursos", replace: true });
    expect(lessonCloudBinding.get().session?.lessonId).toBe(mainLesson);
  });

  it("depois das 5 atividades o curso abre e a lição começa", () => {
    completeMainActivities(5);
    navigate.mockClear();
    renderLesson(StartRoute, courseLesson);
    expect(navigate).not.toHaveBeenCalledWith({ to: "/cursos", replace: true });
    expect(lessonCloudBinding.get().session?.lessonId).toBe(courseLesson);
  });
});
