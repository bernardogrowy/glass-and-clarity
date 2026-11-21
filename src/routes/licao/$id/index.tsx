import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useHydrated } from "@/hooks/use-hydrated";
import { getActiveSession, startLesson, useLessonStore } from "@/lib/lesson-store";
import { getLesson } from "@/lib/lessons";
import { STEP_ROUTES, useCourseLock } from "@/lib/use-lesson-step";

export const Route = createFileRoute("/licao/$id/")({
  head: () => ({ meta: [{ title: "Lição — Hi" }] }),
  component: LicaoStart,
});

/** Ponto de entrada: retoma a lição em andamento ou começa uma nova. */
function LicaoStart() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const store = useLessonStore();
  const locked = useCourseLock(id);

  useEffect(() => {
    if (!hydrated || locked) return;
    const lesson = getLesson(id);
    if (!lesson) {
      navigate({ to: "/", replace: true });
      return;
    }
    const session = getActiveSession(store, id);
    if (!session) {
      startLesson(id);
      return;
    }
    const step = lesson.steps[session.stepIndex];
    if (step) navigate({ to: STEP_ROUTES[step.kind], params: { id }, replace: true });
  }, [hydrated, locked, store, id, navigate]);

  return (
    <AppShell hideTabs>
      <p className="mt-24 text-center text-sm text-muted-foreground">Preparando sua lição…</p>
    </AppShell>
  );
}
