import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { advanceStep, getActiveSession, startLesson, useLessonStore } from "@/lib/lesson-store";
import { getLesson, type Lesson, type LessonStep, type StepKind } from "@/lib/lessons";

export const STEP_ROUTES = {
  descobrir: "/licao/$id/descobrir",
  escolha: "/licao/$id/escolha",
  pares: "/licao/$id/pares",
  ordenar: "/licao/$id/ordenar",
  dialogo: "/licao/$id/dialogo",
} as const satisfies Record<StepKind, string>;

export type StepContext<K extends StepKind> = {
  lesson: Lesson;
  step: Extract<LessonStep, { kind: K }>;
  index: number;
  total: number;
};

/**
 * Liga uma rota de exercício à sessão atual: cria a sessão se não existir, e redireciona
 * quando a URL não bate com a etapa em andamento (refresh, botão voltar, link antigo).
 * Devolve `null` enquanto não está pronto pra renderizar.
 */
export function useLessonStep<K extends StepKind>(
  kind: K,
  lessonId: string,
): StepContext<K> | null {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const store = useLessonStore();

  const lesson = getLesson(lessonId);
  const session = getActiveSession(store, lessonId);
  const step = lesson && session ? lesson.steps[session.stepIndex] : undefined;

  useEffect(() => {
    if (!hydrated) return;
    if (!lesson) {
      navigate({ to: "/", replace: true });
    } else if (!session) {
      startLesson(lessonId);
    } else if (!step) {
      navigate({ to: "/licao/$id/resumo", params: { id: lessonId }, replace: true });
    } else if (step.kind !== kind) {
      navigate({ to: STEP_ROUTES[step.kind], params: { id: lessonId }, replace: true });
    }
  }, [hydrated, lesson, session, step, kind, lessonId, navigate]);

  if (!lesson || !session || !step || step.kind !== kind) return null;
  return {
    lesson,
    step: step as Extract<LessonStep, { kind: K }>,
    index: session.stepIndex,
    total: lesson.steps.length,
  };
}

/** Avança pra próxima etapa (ou fecha a lição e vai pro resumo). */
export function useLessonNext(lesson: Lesson, index: number) {
  const navigate = useNavigate();
  return () => {
    const next = lesson.steps[index + 1];
    if (next) {
      advanceStep(index);
      navigate({ to: STEP_ROUTES[next.kind], params: { id: lesson.id } });
    } else {
      // O resumo fecha a lição (finishLesson) ao montar — assim esta tela não "pisca" pro início.
      navigate({ to: "/licao/$id/resumo", params: { id: lesson.id } });
    }
  };
}
