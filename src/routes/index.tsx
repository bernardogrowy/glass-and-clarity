import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Bell,
  ArrowRight,
  Coffee,
  Briefcase,
  Stethoscope,
  Plane,
  Flame,
  Layers,
  CalendarCheck,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActivityWeek } from "@/components/ActivityWeek";
import { MascotAvatar } from "@/components/MascotAvatar";
import { MentorCard } from "@/components/MentorCard";
import { unreadCount, useInbox } from "@/lib/notifications-store";
import { getDueCards, getMasteryBuckets, useFlashcardsStore } from "@/lib/flashcards-store";
import { getReviewDue } from "@/lib/review-session";
import { useReviewStore } from "@/lib/review-store";
import { getActiveSession, getLessonStagesReached, useLessonStore } from "@/lib/lesson-store";
import { DAILY_LESSON_ID, getLesson } from "@/lib/lessons";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { useProfileStore } from "@/lib/profile-store";
import { getActiveDates, useStreakStore } from "@/lib/streak-store";
import { SKILLS } from "@/lib/trail";
import { getCurrent, getUnitProgress, useTrailStore } from "@/lib/trail-store";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hi — Pratique conversas da sua vida real" },
      {
        name: "description",
        content:
          "O Hi transforma situações reais em prática de conversação, vocabulário útil e evolução mensurável.",
      },
      { property: "og:title", content: "Hi — Pratique conversas da sua vida real" },
      {
        property: "og:description",
        content:
          "Escolha a vida que quer viver no novo idioma. O Hi prepara você para conversar nela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const situations = [
  { icon: Coffee, title: "Pedir um café em Londres", time: "5 min", tone: "bg-peach" },
  { icon: Briefcase, title: "Explicar seu trabalho", time: "10 min", tone: "bg-sky" },
  { icon: Stethoscope, title: "Marcar uma consulta", time: "10 min", tone: "bg-mint" },
  { icon: Plane, title: "Check-in no aeroporto", time: "5 min", tone: "bg-lilac" },
];

function Segments({
  filled,
  colors,
  count = 4,
}: {
  filled: number;
  colors?: string[];
  count?: number;
}) {
  return (
    <div className="mt-4 flex gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < filled ? (colors?.[i] ?? "bg-accent") : "bg-foreground/10"}`}
        />
      ))}
    </div>
  );
}

function Index() {
  const streak = useStreakStore();
  const lessons = useLessonStore();
  const flashcards = useFlashcardsStore();
  const trail = useTrailStore();
  const profile = useProfileStore();
  // Atalho "Palavras de hoje" = atividade atual da trilha (mesma lição, mesmo progresso).
  // Com a trilha toda concluída, volta pra lição avulsa.
  const unreadNotifications = unreadCount(useInbox().items);
  const trailCurrent = getCurrent(trail, profile.level);
  const dailyLesson = getLesson(trailCurrent?.activity.lessonId ?? DAILY_LESSON_ID);
  const activeSession = dailyLesson ? getActiveSession(lessons, dailyLesson.id) : null;
  const trailUnitProgress = trailCurrent ? getUnitProgress(trail, trailCurrent.unit) : null;
  const totalDue = flashcards.decks.reduce(
    (sum, d) => sum + getDueCards(flashcards, d.id).length,
    0,
  );
  const mastery = getMasteryBuckets(flashcards);
  const reviewDue = getReviewDue(useReviewStore(), Date.now()).length;
  const onboarding = useOnboardingStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Não existe pular: enquanto o questionário não foi respondido, a Home leva para ele.
    if (!onboarding.completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [onboarding.completed, navigate]);

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <Link
          to="/perfil"
          aria-label="Perfil"
          className="glass press grid h-11 w-11 place-items-center overflow-hidden rounded-full"
        >
          <MascotAvatar
            color={profile.avatarColor}
            expression={profile.avatarExpression}
            size={32}
          />
        </Link>
        <span className="font-display text-2xl">Hi.</span>
        <div className="flex items-center gap-2">
          <Link
            to="/streak"
            aria-label={`Sequência de ${streak.current} dia${streak.current === 1 ? "" : "s"}`}
            className="glass press flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium"
          >
            <Flame className="h-4 w-4" />
            {streak.current}
          </Link>
          <Link
            to="/notificacoes"
            aria-label={
              unreadNotifications > 0
                ? `Notificações, ${unreadNotifications} não lida${unreadNotifications === 1 ? "" : "s"}`
                : "Notificações"
            }
            className="glass press relative grid h-11 w-11 place-items-center rounded-full text-foreground"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />
            )}
          </Link>
        </div>
      </header>

      <section className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          {getGreeting()}
          {profile.name ? `, ${profile.name}` : ""}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight">
          Que conversa você quer viver hoje?
        </h1>
      </section>

      <MentorCard />

      <ActivityWeek practicedDates={getActiveDates(streak)} />

      <article className="surface mt-8 rounded-3xl p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded-full bg-butter px-3 py-1 font-medium text-foreground">
            Missão do dia
          </span>
          <span>10 min · {profile.level}</span>
        </div>
        <h2 className="mt-5 font-display text-3xl leading-snug">
          Contar como foi seu fim de semana
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Passado simples, conectores e 6 palavras novas para reutilizar.
        </p>
        <Link
          to="/pratica"
          className="glass-dark press mt-6 flex h-14 items-center justify-center gap-2 rounded-full font-medium"
        >
          Começar conversa <ArrowRight className="h-4 w-4" />
        </Link>
      </article>

      <div className="mt-10 mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Vocabulário</h3>
        <Link to="/trilha" className="flex items-center gap-1 text-sm font-medium">
          Ver trilha <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {dailyLesson && (
          <Link
            to="/licao/$id"
            params={{ id: dailyLesson.id }}
            className="surface press rounded-3xl p-4"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint">
              <Layers className="h-5 w-5" />
            </div>
            <p className="mt-6 font-display text-lg leading-snug">Palavras de hoje</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeSession
                ? `Continuar · ${activeSession.stepIndex + 1}/${dailyLesson.steps.length}`
                : trailCurrent
                  ? `${SKILLS[trailCurrent.activity.skill].label} · ${dailyLesson.minutes} min`
                  : `${dailyLesson.words.length} novas · ${dailyLesson.minutes} min`}
            </p>
            {trailCurrent && trailUnitProgress ? (
              <>
                <Segments filled={trailUnitProgress.done} count={trailUnitProgress.total} />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Trilha · Unidade {trailCurrent.unit.number}
                </p>
              </>
            ) : (
              <Segments filled={getLessonStagesReached(lessons, dailyLesson)} />
            )}
          </Link>
        )}
        <Link to="/baralhos" className="surface press rounded-3xl p-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-peach">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 font-display text-lg leading-snug">Pra revisar hoje</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalDue} card{totalDue === 1 ? "" : "s"} · {Math.max(1, Math.ceil(totalDue / 2))} min
          </p>
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {[
              { n: mastery.fraco, color: "bg-peach" },
              { n: mastery.medio, color: "bg-butter" },
              { n: mastery.forte, color: "bg-accent" },
            ].map(({ n, color }) => (
              <span
                key={color}
                className={`h-1.5 rounded-full ${color}`}
                style={{ flexGrow: Math.max(n, 0.4) }}
              />
            ))}
          </div>
        </Link>
      </div>

      {reviewDue > 0 && (
        <Link to="/revisao" className="surface press mt-3 flex items-center gap-4 rounded-3xl p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lilac">
            <RotateCcw className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">Revisão do dia</span>
            <span className="block text-xs text-muted-foreground">
              {reviewDue} {reviewDue === 1 ? "palavra" : "palavras"} de unidades anteriores
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <h3 className="mt-10 mb-4 text-sm font-medium text-muted-foreground">Situações reais</h3>
      <div className="grid grid-cols-2 gap-3">
        {situations.map(({ icon: Icon, title, time, tone }) => (
          <Link to="/pratica" key={title} className="surface press rounded-3xl p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-6 font-display text-lg leading-snug">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{time}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
