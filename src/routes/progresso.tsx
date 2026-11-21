import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Trophy, Flame, Plus, Check, Circle, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActivityWeek } from "@/components/ActivityWeek";
import { GoalWizard } from "@/components/GoalWizard";
import { StreakCelebration } from "@/components/StreakCelebration";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getVocabMasteryPct, useFlashcardsStore } from "@/lib/flashcards-store";
import { getFirstTryPct, getWordsAtStage, useLessonStore } from "@/lib/lesson-store";
import {
  COMPETENCY_INFO,
  COMPETENCY_LIST,
  getCompetencyScore,
  getCompetencyTier,
  getGoalProgress,
  getMinutesThisWeek,
  getPracticedDatesThisWeek,
  getSessionsThisWeek,
  getWeekRange,
  toggleStep,
  useProgressStore,
} from "@/lib/progress-store";
import { useProfileStore } from "@/lib/profile-store";
import { registerActivity, useStreakStore } from "@/lib/streak-store";
import { ACTIVITIES } from "@/lib/trail";
import { getCurrent, getTotalDone, getUnitProgress, useTrailStore } from "@/lib/trail-store";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso — Hi" },
      {
        name: "description",
        content: "Acompanhe sua evolução por competência e suas metas pessoais.",
      },
      { property: "og:title", content: "Progresso — Hi" },
      {
        property: "og:description",
        content: "Acompanhe sua evolução por competência e suas metas pessoais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Progresso,
});

function Progresso() {
  const progress = useProgressStore();
  const flashcards = useFlashcardsStore();
  const lessons = useLessonStore();
  const streakState = useStreakStore();
  const trail = useTrailStore();
  const { level } = useProfileStore();
  const trailCurrent = getCurrent(trail, level);
  const trailUnit = trailCurrent ? getUnitProgress(trail, trailCurrent.unit) : null;
  const trailDone = getTotalDone(trail);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [streakInfo, setStreakInfo] = useState<number | null>(null);
  const openGoal = progress.goals.find((g) => g.id === openGoalId) ?? null;

  const handleToggleStep = (goalId: string, stepId: string, wasDone: boolean) => {
    toggleStep(goalId, stepId);
    if (wasDone) return;
    const result = registerActivity();
    if (result.isFirstToday) setStreakInfo(result.streak);
  };

  const vocabStages = [
    { label: "Descobertas", n: getWordsAtStage(lessons, 1) },
    { label: "Reconhecidas", n: getWordsAtStage(lessons, 2) },
    { label: "Recordadas", n: getWordsAtStage(lessons, 3) },
    { label: "Usadas em conversa", n: getWordsAtStage(lessons, 4) },
  ];
  const vocabTotal = vocabStages[0]?.n ?? 0;
  const firstTryPct = getFirstTryPct(lessons);

  const vocabMasteryPct = getVocabMasteryPct(flashcards);
  const minutes = getMinutesThisWeek(progress);
  const sessionsThisWeek = getSessionsThisWeek(progress);

  const { start, end } = getWeekRange(new Date());
  const flashcardReviewDatesThisWeek = flashcards.cards
    .filter((c) => c.lastReviewedAt && c.lastReviewedAt >= start && c.lastReviewedAt < end)
    .map((c) => new Date(c.lastReviewedAt!));
  const practicedDates = [...getPracticedDatesThisWeek(progress), ...flashcardReviewDatesThisWeek];

  const competencyScores = COMPETENCY_LIST.map((c) => ({
    id: c,
    score: getCompetencyScore(c, progress, c === "vocabulario" ? vocabMasteryPct : null),
  }));
  const topCompetency = [...competencyScores]
    .filter((c) => c.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  const narrative = [
    `Você praticou ${minutes} minuto${minutes === 1 ? "" : "s"} essa semana.`,
    sessionsThisWeek.length > 0
      ? `Completou ${sessionsThisWeek.length} missã${sessionsThisWeek.length === 1 ? "o" : "es"}${
          topCompetency ? ` e evoluiu em "${COMPETENCY_INFO[topCompetency.id].label}"` : ""
        }.`
      : "Ainda não concluiu nenhuma missão essa semana.",
  ].join(" ");

  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">Sua semana</p>
      <h1 className="mt-1 font-display text-4xl">Você está evoluindo.</h1>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="surface rounded-3xl p-4">
          <div className="bg-mint grid h-10 w-10 place-items-center rounded-2xl">
            <Mic className="h-4 w-4 text-foreground/70" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Minutos falados</p>
          <p className="font-display text-xl">{minutes}</p>
        </div>
        <div className="surface rounded-3xl p-4">
          <div className="bg-peach grid h-10 w-10 place-items-center rounded-2xl">
            <Trophy className="h-4 w-4 text-foreground/70" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Missões concluídas</p>
          <p className="font-display text-xl">{sessionsThisWeek.length}</p>
        </div>
        <div className="surface rounded-3xl p-4">
          <div className="bg-lilac grid h-10 w-10 place-items-center rounded-2xl">
            <Flame className="h-4 w-4 text-foreground/70" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sequência</p>
          <p className="font-display text-xl">
            {streakState.current} dia{streakState.current === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <p className="surface mt-4 rounded-2xl p-4 text-sm text-muted-foreground">{narrative}</p>

      <ActivityWeek practicedDates={practicedDates} />

      <Link to="/trilha" className="surface press mt-8 block rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Sua trilha</h2>
          <ArrowRight className="h-4 w-4" />
        </div>
        {trailCurrent ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Unidade {trailCurrent.unit.number} · {trailCurrent.unit.title}
            </p>
            <Progress value={trailUnit?.pct ?? 0} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {trailUnit?.done} de {trailUnit?.total} atividades · {trailDone} de{" "}
              {ACTIVITIES.length} na trilha toda
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Você concluiu todas as {ACTIVITIES.length} atividades. Novas unidades em breve.
          </p>
        )}
      </Link>

      <section className="surface mt-8 rounded-3xl p-5">
        <h2 className="font-display text-2xl">Seu vocabulário</h2>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-5xl">{vocabTotal}</span>
          <span className="text-muted-foreground">palavra{vocabTotal === 1 ? "" : "s"}</span>
        </p>
        <ul className="mt-4 space-y-3">
          {vocabStages.map(({ label, n }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0">{label}</span>
              <Progress value={vocabTotal === 0 ? 0 : (100 * n) / vocabTotal} className="flex-1" />
              <span className="w-6 text-right font-semibold">{n}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-sky/50 p-4">
            <p className="font-display text-3xl">
              {firstTryPct === null ? "—" : `${firstTryPct}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">acerto na 1ª tentativa</p>
          </div>
          <div className="rounded-2xl bg-mint/50 p-4">
            <p className="font-display text-3xl">
              {vocabMasteryPct === null ? "—" : `${vocabMasteryPct}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">dominadas nos baralhos</p>
          </div>
        </div>
        {vocabTotal === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Faça a lição "Palavras de hoje" no início pra ver seu vocabulário crescer aqui.
          </p>
        )}
      </section>

      <h2 className="mt-10 mb-4 font-display text-2xl">Progresso por competência</h2>
      <div className="space-y-4">
        {competencyScores.map(({ id, score }) => {
          const info = COMPETENCY_INFO[id];
          if (score === null) {
            return (
              <div key={id} className="surface rounded-3xl p-4">
                <p className="font-medium">{info.label}</p>
                <button
                  onClick={() => setWizardOpen(true)}
                  className="mt-1 text-xs text-muted-foreground underline underline-offset-2"
                >
                  Ainda sem dados — crie uma meta ligada a essa competência
                </button>
              </div>
            );
          }
          const tier = getCompetencyTier(score);
          return (
            <div key={id} className="surface rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{info.label}</p>
                <span className="text-sm text-muted-foreground">{score}%</span>
              </div>
              <Progress value={score} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">{info[tier]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-2xl">Minhas metas</h2>
        <button
          onClick={() => setWizardOpen(true)}
          aria-label="Nova meta"
          className="glass press grid h-10 w-10 place-items-center rounded-full"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {progress.goals.length === 0 ? (
        <div className="surface mt-4 rounded-3xl p-6 text-center text-sm text-muted-foreground">
          Você ainda não criou nenhuma meta. Toque no "+" pra começar.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {progress.goals.map((goal) => {
            const goalScore = getGoalProgress(goal);
            const done = goal.steps.filter((s) => s.done).length;
            return (
              <button
                key={goal.id}
                onClick={() => setOpenGoalId(goal.id)}
                className="surface press w-full rounded-3xl p-4 text-left"
              >
                <p className="font-medium">{goal.objetivo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Até {new Date(goal.prazo).toLocaleDateString("pt-BR")} · {done}/
                  {goal.steps.length} etapas
                </p>
                <Progress value={goalScore} className="mt-3" />
              </button>
            );
          })}
        </div>
      )}

      <GoalWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <Dialog open={!!openGoal} onOpenChange={(o) => !o && setOpenGoalId(null)}>
        <DialogContent className="surface max-h-[80vh] overflow-y-auto rounded-3xl border-none">
          {openGoal && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{openGoal.objetivo}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{openGoal.situacao}</p>
              <ul className="mt-4 space-y-2">
                {openGoal.steps.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => handleToggleStep(openGoal.id, s.id, s.done)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-muted px-4 py-3 text-left"
                    >
                      {s.done ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={
                          s.done ? "text-sm text-muted-foreground line-through" : "text-sm"
                        }
                      >
                        {s.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>

      <StreakCelebration
        streak={streakInfo ?? 0}
        open={streakInfo !== null}
        onOpenChange={(open) => !open && setStreakInfo(null)}
      />
    </AppShell>
  );
}
