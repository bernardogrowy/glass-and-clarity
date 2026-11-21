import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Lock, Play } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { COURSES, SKILLS, type Course } from "@/lib/trail";
import {
  getCourseActivityStatus,
  getCourseCurrent,
  getCourseProgress,
  getCoursesUnlock,
  useTrailStore,
  type TrailState,
} from "@/lib/trail-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos extras — Hi" },
      {
        name: "description",
        content:
          "Trilhas paralelas à trilha profissional: vida cotidiana, conversa social, viagem, tecnologia e mais.",
      },
    ],
  }),
  component: Cursos,
});

function Cursos() {
  const trail = useTrailStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = COURSES.find((c) => c.id === openId);
  const unlock = getCoursesUnlock(trail);

  return (
    <AppShell>
      {!unlock.unlocked ? (
        <LockedCourses unlock={unlock} />
      ) : open ? (
        <CourseView course={open} trail={trail} onBack={() => setOpenId(null)} />
      ) : (
        <CourseList trail={trail} onOpen={setOpenId} />
      )}
    </AppShell>
  );
}

/** Antes de concluir as atividades mínimas da trilha: mostra o progresso e uma prévia dos cursos. */
function LockedCourses({ unlock }: { unlock: ReturnType<typeof getCoursesUnlock> }) {
  const pct = Math.round((100 * unlock.done) / unlock.needed);
  return (
    <>
      <header>
        <Link
          to="/trilha"
          className="glass press inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Trilha
        </Link>
        <h1 className="mt-5 font-display text-4xl leading-tight">Cursos extras</h1>
      </header>

      <section className="surface mt-5 rounded-3xl p-5 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </span>
        <p className="mt-3 font-display text-2xl leading-tight">
          Faltam {unlock.remaining} {unlock.remaining === 1 ? "atividade" : "atividades"} para
          liberar
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Os cursos extras complementam a trilha. Eles abrem depois de {unlock.needed} atividades da
          trilha principal, a primeira unidade completa, para você começar pelo essencial.
        </p>
        <span
          aria-hidden="true"
          className="mt-4 block h-2 overflow-hidden rounded-full bg-foreground/10"
        >
          <span className="block h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
        </span>
        <p className="mt-2 text-sm font-medium">
          {unlock.done} de {unlock.needed} atividades da trilha
        </p>
        <Link
          to="/trilha"
          className="glass-dark press mt-4 flex h-12 items-center justify-center gap-2 rounded-full font-medium"
        >
          Ir para a trilha <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        O que vem por aí
      </p>
      <ul className="mt-3 space-y-3">
        {COURSES.map((course) => {
          const Icon = course.icon;
          return (
            <li
              key={course.id}
              className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-foreground/25 p-4"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-card">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-snug text-muted-foreground">
                  {course.title}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {course.levels} · {course.units.length} unidades
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CourseList({ trail, onOpen }: { trail: TrailState; onOpen: (id: string) => void }) {
  return (
    <>
      <header>
        <Link
          to="/trilha"
          className="glass press inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Trilha
        </Link>
        <h1 className="mt-5 font-display text-4xl leading-tight">Cursos extras</h1>
        <p className="mt-2 text-muted-foreground">
          Trilhas paralelas à trilha profissional. Faça no seu ritmo, na ordem que preferir.
        </p>
      </header>

      <ul className="mt-6 space-y-3">
        {COURSES.map((course) => {
          const launched = course.units.length > 0;
          const { done, total, pct } = getCourseProgress(trail, course);
          const Icon = course.icon;
          return (
            <li key={course.id}>
              <button
                type="button"
                onClick={() => onOpen(course.id)}
                className="surface press flex w-full items-center gap-4 rounded-3xl p-4 text-left"
              >
                <span
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-full",
                    launched ? course.tone : "bg-card",
                  )}
                >
                  <Icon className={cn("h-6 w-6", !launched && "text-muted-foreground")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{course.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {course.levels} ·{" "}
                    {launched
                      ? `${course.units.length} unidades · ${done} de ${total} atividades`
                      : "Em breve"}
                  </span>
                  {launched && (
                    <span
                      aria-hidden="true"
                      className="mt-2 block h-2 overflow-hidden rounded-full bg-foreground/10"
                    >
                      <span
                        className="block h-full rounded-full bg-teal-700"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function CourseView({
  course,
  trail,
  onBack,
}: {
  course: Course;
  trail: TrailState;
  onBack: () => void;
}) {
  const launched = course.units.length > 0;
  const { done, total, pct } = getCourseProgress(trail, course);
  const current = getCourseCurrent(trail, course);
  const Icon = course.icon;

  return (
    <>
      <header>
        <button
          type="button"
          onClick={onBack}
          className="glass press inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Cursos
        </button>
        <div className="mt-5 flex items-center gap-4">
          <span
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-full",
              launched ? course.tone : "bg-card",
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl leading-tight">{course.title}</h1>
            <p className="text-sm text-muted-foreground">Nível sugerido: {course.levels}</p>
          </div>
        </div>
        <p className="mt-3 text-muted-foreground">{course.description}</p>
      </header>

      {launched ? (
        <>
          <div className="surface mt-5 rounded-3xl p-4">
            <p className="text-sm text-muted-foreground">
              {done} de {total} atividades · {pct}%
            </p>
            <span
              aria-hidden="true"
              className="mt-2 block h-2 overflow-hidden rounded-full bg-foreground/10"
            >
              <span
                className="block h-full rounded-full bg-teal-700"
                style={{ width: `${pct}%` }}
              />
            </span>
            {current ? (
              <Link
                to="/licao/$id"
                params={{ id: current.activity.lessonId }}
                className="glass-dark press mt-4 flex h-12 items-center justify-center gap-2 rounded-full font-medium"
              >
                {done === 0 ? "Começar" : "Continuar"} · {SKILLS[current.activity.skill].label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-3 text-sm font-medium">Você concluiu este curso. Bom trabalho!</p>
            )}
          </div>

          <ul className="mt-6 space-y-4">
            {course.units.map((unit) => (
              <li key={unit.id} className="surface rounded-3xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {unit.code} · Unidade {unit.number}
                </p>
                <h2 className="mt-1 font-display text-2xl leading-tight">{unit.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{unit.description}</p>
                <ul className="mt-3 space-y-2">
                  {unit.activities.map((activity) => {
                    const status = getCourseActivityStatus(trail, course, activity);
                    const skill = SKILLS[activity.skill];
                    const row = (
                      <>
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                            status === "concluida" && "bg-mint",
                            status === "atual" && "glass-dark",
                            status === "bloqueada" && "bg-card",
                          )}
                        >
                          {status === "concluida" ? (
                            <Check className="h-4 w-4" />
                          ) : status === "atual" ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block font-medium leading-tight",
                              status === "bloqueada" && "text-muted-foreground",
                            )}
                          >
                            {skill.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {status === "bloqueada"
                              ? "Termine a etapa anterior"
                              : `${activity.minutes} min · ${activity.title}`}
                          </span>
                        </span>
                      </>
                    );
                    return (
                      <li key={activity.id}>
                        {status === "bloqueada" ? (
                          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-foreground/20 p-2.5">
                            {row}
                          </div>
                        ) : (
                          <Link
                            to="/licao/$id"
                            params={{ id: activity.lessonId }}
                            className="press flex items-center gap-3 rounded-2xl bg-background/60 p-2.5"
                          >
                            {row}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <section className="mt-6">
          <p className="rounded-2xl bg-butter/40 p-4 text-sm leading-snug">
            Este curso ainda está em preparação. Veja o que vem por aí:
          </p>
          <ul className="mt-4 space-y-3">
            {course.planned.map((unit) => (
              <li
                key={unit.code}
                className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-foreground/25 p-4"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-card">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </span>
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {unit.code} · Em breve
                  </span>
                  <span className="block font-semibold leading-snug">{unit.title}</span>
                  <span className="block text-sm text-muted-foreground">{unit.scenario}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
