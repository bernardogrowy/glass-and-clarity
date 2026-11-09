import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Trophy, Flame, Plus, Check, Circle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ActivityWeek } from "@/components/ActivityWeek";
import { GoalWizard } from "@/components/GoalWizard";
import { StreakCelebration } from "@/components/StreakCelebration";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getVocabMasteryPct, useFlashcardsStore } from "@/lib/flashcards-store";
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
import { registerActivity, useStreakStore } from "@/lib/streak-store";

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
  const streakState = useStreakStore();
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
