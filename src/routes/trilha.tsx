import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  Flame,
  Lock,
  RotateCcw,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LessonSheet } from "@/components/trail/LessonSheet";
import { NODE_CENTER_Y, ROW_HEIGHT, TOP_PAD, nodeX } from "@/components/trail/layout";
import { PathConnectors, PathNode } from "@/components/trail/PathNode";
import { SectionSheet } from "@/components/trail/SectionSheet";
import { BackToCurrent, LockedHint } from "@/components/trail/TrailHints";
import { UnitHeader } from "@/components/trail/UnitHeader";
import { getDueCards, useFlashcardsStore, type Card } from "@/lib/flashcards-store";
import { getActiveSession, useLessonStore } from "@/lib/lesson-store";
import { getLesson } from "@/lib/lessons";
import { getReviewDue } from "@/lib/review-session";
import { useReviewStore } from "@/lib/review-store";
import { updateProfile, useProfileStore, type Level } from "@/lib/profile-store";
import { useStreakStore } from "@/lib/streak-store";
import {
  SKILLS,
  TRAIL_NAME,
  UNITS,
  getActivity,
  getNextLevelWithContent,
  getTrackLevel,
  getVisibleUnits,
  getPreviousActivity,
  getSectionOf,
  getUnit,
  getUnitOf,
  type Activity,
  type Unit,
} from "@/lib/trail";
import {
  getActivityStatus,
  getAdjacentUnit,
  getCoursesUnlock,
  getCurrent,
  getUnitProgress,
  getUnitStatus,
  isActivityDone,
  useTrailStore,
} from "@/lib/trail-store";

export const Route = createFileRoute("/trilha")({
  head: () => ({
    meta: [
      { title: "Trilha — Hi" },
      {
        name: "description",
        content:
          "Siga a trilha de vocabulário: atividades em ordem, progresso salvo e revisão das palavras fracas.",
      },
      { property: "og:title", content: "Trilha — Hi" },
      {
        property: "og:description",
        content: "Siga a trilha de vocabulário e veja sua evolução unidade por unidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trilha,
});

const JUST_COMPLETED_MS = 15_000;
const HOUR_MS = 60 * 60 * 1000;

/** Card "fraco": já vencido E (foi revisado antes ou foi agendado de propósito, ex.: errou na lição). */
function isWeakAndDue(card: Card, now: number) {
  return card.dueAt <= now && (card.reviewCount > 0 || card.dueAt - card.createdAt > HOUR_MS);
}

function hintFor(activity: Activity): string {
  const previous = getPreviousActivity(activity);
  if (!previous) return "Ainda não está disponível";
  if (previous.unitId !== activity.unitId) {
    return `Passe no checkpoint da Unidade ${getUnitOf(previous).number} para abrir`;
  }
  return previous.skill === "checkpoint"
    ? "Passe no checkpoint para abrir"
    : `Termine ${SKILLS[previous.skill].label} para abrir`;
}

function Trilha() {
  const trail = useTrailStore();
  const lessons = useLessonStore();
  const flashcards = useFlashcardsStore();
  const streak = useStreakStore();
  const profile = useProfileStore();
  const reviewState = useReviewStore();
  const level = profile.level;

  const [viewUnitId, setViewUnitId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [offscreen, setOffscreen] = useState<"up" | "down" | null>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const scrollPending = useRef(false);
  const clearHint = useCallback(() => setHint(null), []);

  const current = getCurrent(trail, level);
  const unit: Unit | undefined =
    (viewUnitId ? getUnit(viewUnitId) : undefined) ??
    current?.unit ??
    getVisibleUnits(level).at(-1) ??
    UNITS.at(-1);
  const viewingCurrentUnit = !!unit && current?.unit.id === unit.id;
  const currentActivityId = viewingCurrentUnit ? current?.activity.id : undefined;

  // Observa o nó atual: fora da tela, aparece o atalho "Voltar à atividade atual".
  useEffect(() => {
    const el = currentRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOffscreen(null);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setOffscreen(entry.isIntersecting ? null : entry.boundingClientRect.top < 0 ? "up" : "down");
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [unit?.id, currentActivityId]);

  // Depois de trocar de unidade pedindo "voltar à atual", rola até o nó assim que ele existir.
  useEffect(() => {
    if (!scrollPending.current || !currentRef.current) return;
    scrollPending.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    currentRef.current.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  });

  if (!unit) {
    return (
      <AppShell>
        <p className="mt-24 text-center text-muted-foreground">A trilha ainda não tem unidades.</p>
      </AppShell>
    );
  }

  const section = getSectionOf(unit);
  const progress = getUnitProgress(trail, unit);
  const upcomingLevel = getNextLevelWithContent(level);
  const coursesUnlock = getCoursesUnlock(trail);
  const reviewDue = getReviewDue(reviewState, Date.now()).length;
  const previousUnit = getAdjacentUnit(unit, -1, level);
  const nextUnit = getAdjacentUnit(unit, 1, level);
  const total = unit.activities.length;
  const doneUntil = unit.activities.filter((a) => isActivityDone(trail, a.id)).length;
  const now = Date.now();

  const reviewDeckFor = (activity: Activity): string | null => {
    const lesson = getLesson(activity.lessonId);
    const deck = lesson && flashcards.decks.find((d) => d.name === lesson.deckName);
    if (!lesson || !deck) return null;
    const fronts = new Set(lesson.words.map((w) => w.en.toLowerCase()));
    const weak = getDueCards(flashcards, deck.id, now).some(
      (c) => fronts.has(c.front.toLowerCase()) && isWeakAndDue(c, now),
    );
    return weak ? deck.id : null;
  };

  const points = unit.activities.map((activity, i) => ({
    x: nodeX(i, total, activity),
    y: TOP_PAD + i * ROW_HEIGHT + NODE_CENTER_Y,
  }));
  const pathHeight = TOP_PAD + total * ROW_HEIGHT;

  const selected = selectedId ? getActivity(selectedId) : undefined;
  const selectedLesson = selected ? getLesson(selected.lessonId) : undefined;
  const session = selected ? getActiveSession(lessons, selected.lessonId) : null;
  const strayLesson = lessons.session;

  const showUnit = (target: Unit) => {
    setViewUnitId(target.id);
    window.scrollTo({ top: 0 });
  };

  const goToCurrent = () => {
    if (!current) return;
    scrollPending.current = true;
    if (current.unit.id !== unit.id) setViewUnitId(current.unit.id);
    else {
      scrollPending.current = false;
      currentRef.current?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  };

  const pressNode = (activity: Activity) => {
    if (getActivityStatus(trail, activity, level) === "bloqueada") {
      setHint(hintFor(activity));
      return;
    }
    setSelectedId(activity.id);
    setSheetOpen(true);
  };

  const showBackToCurrent =
    !!current && !sheetOpen && !sectionsOpen && (!viewingCurrentUnit || offscreen !== null);

  return (
    <AppShell>
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setSectionsOpen(true)}
          aria-label={`${TRAIL_NAME} — ver seções`}
          className="glass press flex h-14 min-w-0 items-center gap-3 rounded-full py-2 pl-2 pr-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400">
            <RouteIcon className="h-5 w-5" />
          </span>
          <span className="truncate font-semibold">{TRAIL_NAME}</span>
        </button>
        <Link
          to="/streak"
          aria-label={`Sequência de ${streak.current} dia${streak.current === 1 ? "" : "s"}`}
          className="glass press flex h-14 items-center gap-2 rounded-full px-5 text-lg font-semibold"
        >
          <Flame className="h-5 w-5" />
          {streak.current}
        </Link>
      </header>

      {previousUnit && getUnitStatus(trail, previousUnit, level) === "concluida" && (
        <div className="surface mt-5 flex items-center gap-4 rounded-3xl p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Unidade {previousUnit.number} · Concluída
            </p>
            <p className="truncate font-semibold">{previousUnit.title}</p>
          </div>
          <button
            type="button"
            onClick={() => showUnit(previousUnit)}
            className="glass press h-10 shrink-0 rounded-full px-5 text-sm font-medium"
          >
            Revisar
          </button>
        </div>
      )}

      <UnitHeader
        section={section}
        unit={unit}
        done={progress.done}
        total={progress.total}
        pct={progress.pct}
        onOpenSections={() => setSectionsOpen(true)}
      />

      <div className="relative mt-6" style={{ height: pathHeight }}>
        <PathConnectors points={points} doneUntil={doneUntil} height={pathHeight} />
        {unit.activities.map((activity, i) => {
          const status = getActivityStatus(trail, activity, level);
          const record = trail.completed[activity.id];
          return (
            <PathNode
              key={activity.id}
              ref={activity.id === currentActivityId ? currentRef : undefined}
              activity={activity}
              status={status}
              needsReview={status === "concluida" && reviewDeckFor(activity) !== null}
              justCompleted={!!record && now - record.at < JUST_COMPLETED_MS}
              x={points[i]!.x}
              y={TOP_PAD + i * ROW_HEIGHT}
              onPress={() => pressNode(activity)}
            />
          );
        })}
      </div>

      {nextUnit ? (
        getUnitStatus(trail, nextUnit, level) === "bloqueada" ? (
          <div className="mt-4 flex items-center gap-4 rounded-3xl border-2 border-dashed border-foreground/25 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-card">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Unidade {nextUnit.number} · Bloqueada
              </p>
              <p className="font-semibold leading-snug">{nextUnit.title}</p>
              <p className="text-sm text-muted-foreground">
                Passe no checkpoint da Unidade {unit.number} para abrir.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => showUnit(nextUnit)}
            className="surface press mt-4 flex w-full items-center gap-4 rounded-3xl p-4 text-left"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-mint">
              <ChevronRight className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Unidade {nextUnit.number} ·{" "}
                {getUnitStatus(trail, nextUnit, level) === "concluida" ? "Concluída" : "Disponível"}
              </p>
              <p className="font-semibold leading-snug">{nextUnit.title}</p>
            </div>
          </button>
        )
      ) : upcomingLevel && getUnitStatus(trail, unit, level) === "concluida" ? (
        <div className="surface mt-4 rounded-3xl p-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-butter">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="mt-3 font-display text-2xl leading-tight">
            Você concluiu o nível {section.level}!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando quiser, siga para o nível {upcomingLevel}. O {section.level} continua aberto para
            revisão.
          </p>
          <button
            type="button"
            onClick={() => {
              updateProfile({ ...profile, level: upcomingLevel as Level });
              setViewUnitId(null);
              window.scrollTo({ top: 0 });
            }}
            className="glass-dark press mt-4 flex h-12 w-full items-center justify-center rounded-full font-medium"
          >
            Seguir para o nível {upcomingLevel}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-3xl border-2 border-dashed border-foreground/25 p-4 text-center text-sm text-muted-foreground">
          Mais unidades em breve.
        </p>
      )}

      {reviewDue > 0 && (
        <Link to="/revisao" className="surface press mt-4 flex items-center gap-4 rounded-3xl p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-peach">
            <RotateCcw className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">Revisão do dia</span>
            <span className="block text-sm text-muted-foreground">
              {reviewDue} {reviewDue === 1 ? "palavra" : "palavras"} de unidades anteriores para não
              esquecer.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {upcomingLevel && current && (
        <Link
          to="/teste-de-nivel"
          className="surface press mt-4 flex items-center gap-4 rounded-3xl p-4"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lilac">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">
              Já domina o {getTrackLevel(level)}?
            </span>
            <span className="block text-sm text-muted-foreground">
              Faça um teste rápido e avance para o {upcomingLevel}.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <Link to="/cursos" className="surface press mt-4 flex items-center gap-4 rounded-3xl p-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${coursesUnlock.unlocked ? "bg-sky" : "bg-card"}`}
        >
          {coursesUnlock.unlocked ? (
            <BookOpen className="h-5 w-5" />
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug">Cursos extras</span>
          <span className="block text-sm text-muted-foreground">
            {coursesUnlock.unlocked
              ? "Vida cotidiana, viagem, tecnologia e mais, em trilhas paralelas."
              : `Conclua mais ${coursesUnlock.remaining} ${coursesUnlock.remaining === 1 ? "atividade" : "atividades"} da trilha para liberar.`}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>

      <BackToCurrent
        visible={showBackToCurrent}
        direction={viewingCurrentUnit ? (offscreen ?? "up") : "up"}
        onClick={goToCurrent}
      />
      <LockedHint message={hint} onDone={clearHint} />

      <LessonSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        activity={selected ?? null}
        unit={selected ? getUnitOf(selected) : null}
        status={selected ? getActivityStatus(trail, selected, level) : "bloqueada"}
        resumeStep={
          session && selectedLesson
            ? { current: session.stepIndex + 1, total: selectedLesson.steps.length }
            : null
        }
        otherInProgress={
          !!strayLesson &&
          !strayLesson.summary &&
          !!selected &&
          strayLesson.lessonId !== selected.lessonId &&
          !!getLesson(strayLesson.lessonId)
        }
        bestAccuracy={selected ? (trail.completed[selected.id]?.accuracy ?? null) : null}
        reviewDeckId={
          selected && isActivityDone(trail, selected.id) ? reviewDeckFor(selected) : null
        }
      />

      <SectionSheet
        open={sectionsOpen}
        onOpenChange={setSectionsOpen}
        trail={trail}
        level={level}
        viewingUnitId={unit.id}
        trailName={TRAIL_NAME}
        onSelectUnit={(target) => {
          setSectionsOpen(false);
          showUnit(target);
        }}
        onBackToCurrent={() => {
          setSectionsOpen(false);
          goToCurrent();
        }}
      />
    </AppShell>
  );
}
