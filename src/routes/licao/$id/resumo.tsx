import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Flame } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { MascotAvatar } from "@/components/MascotAvatar";
import { useHydrated } from "@/hooks/use-hydrated";
import { finishLesson, useLessonStore } from "@/lib/lesson-store";
import { getLesson } from "@/lib/lessons";
import { useProfileStore } from "@/lib/profile-store";
import { CHECKPOINT_PASS_ACCURACY, getActivity, getUnitOf } from "@/lib/trail";
import { getAdjacentUnit, isActivityDone, isUnitDone, useTrailStore } from "@/lib/trail-store";

export const Route = createFileRoute("/licao/$id/resumo")({
  head: () => ({ meta: [{ title: "Lição concluída — Hi" }] }),
  component: Resumo,
});

const CONFETTI = [
  "left-[18%] top-6 h-6 w-2 rotate-45 bg-sky",
  "left-[10%] top-16 h-4 w-4 rounded-full bg-peach",
  "right-[14%] top-3 h-5 w-5 rotate-12 rounded-md bg-lilac",
  "right-[24%] top-20 h-3.5 w-3.5 rounded-full bg-butter",
  "left-[24%] top-32 h-2 w-6 -rotate-45 rounded-full bg-mint",
  "right-[10%] top-36 h-2 w-6 rotate-[30deg] rounded-full bg-peach",
];

function Resumo() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const store = useLessonStore();
  const profile = useProfileStore();
  const trail = useTrailStore();
  const lesson = getLesson(id);
  const session = store.session?.lessonId === id ? store.session : null;
  const summary = session?.summary;

  useEffect(() => {
    if (!hydrated) return;
    if (!lesson || !session) {
      navigate({ to: "/", replace: true });
      return;
    }
    // Idempotente: só calcula o resumo e conta a sequência na primeira vez.
    finishLesson();
  }, [hydrated, lesson, session, navigate]);

  if (!lesson || !summary) return null;

  const missedCount = summary.missedWordIds.length;

  // Lição da trilha: mostra o que aconteceu com a atividade e leva de volta pra trilha.
  const activity = getActivity(id);
  const unit = activity ? getUnitOf(activity) : null;
  const isCheckpoint = activity?.skill === "checkpoint";
  const activityDone = activity ? isActivityDone(trail, activity.id) : false;
  const unitDone = unit ? isUnitDone(trail, unit) : false;
  const nextUnit = unit ? getAdjacentUnit(unit, 1) : undefined;
  const failedCheckpoint = isCheckpoint && !activityDone;
  const badge = !activity
    ? "Lição concluída"
    : failedCheckpoint
      ? "Quase lá no checkpoint"
      : unitDone
        ? "Unidade concluída"
        : "Atividade concluída";
  const headline = !activity
    ? `Você aprendeu ${lesson.words.length} palavras novas`
    : failedCheckpoint
      ? `Você acertou ${summary.accuracy}% — precisa de ${CHECKPOINT_PASS_ACCURACY}%`
      : unitDone
        ? `Você terminou “${unit?.title}”`
        : `Você praticou ${lesson.words.length} palavras`;

  return (
    <AppShell hideTabs>
      <div className="relative text-center">
        <div aria-hidden="true">
          {CONFETTI.map((c) => (
            <span key={c} className={`absolute ${c}`} />
          ))}
        </div>
        <div className="mx-auto mt-8 grid h-32 w-32 place-items-center">
          <MascotAvatar color={profile.avatarColor} expression="sorriso" size={128} />
        </div>
        <span
          className={`mt-6 inline-block rounded-full px-4 py-2 text-sm font-semibold ${failedCheckpoint ? "bg-peach" : "bg-mint"}`}
        >
          {badge}
        </span>
        <h1 className="mt-4 font-display text-4xl leading-tight">{headline}</h1>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="surface rounded-3xl p-4">
          <p className="font-display text-3xl">{summary.accuracy}%</p>
          <p className="mt-1 text-sm leading-tight text-muted-foreground">acerto na 1ª tentativa</p>
        </div>
        <div className="surface rounded-3xl p-4">
          <p className="font-display text-3xl">{summary.minutes} min</p>
          <p className="mt-1 text-sm leading-tight text-muted-foreground">de prática</p>
        </div>
        <div className="rounded-3xl bg-peach/60 p-4">
          <p className="flex items-center gap-1 font-display text-3xl">
            <Flame className="h-5 w-5" />
            {summary.streakGained ? "+1" : summary.streak}
          </p>
          <p className="mt-1 text-sm leading-tight text-foreground/70">
            {summary.streakGained ? "dia de sequência" : "sequência mantida"}
          </p>
        </div>
      </div>

      <section className="surface mt-4 rounded-3xl p-5">
        <p className="text-muted-foreground">Palavras desta lição</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {lesson.words.map((w) => (
            <li key={w.id} className={`${w.tone} rounded-full px-4 py-2 font-semibold`}>
              {w.en}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-muted-foreground">
          {missedCount > 0
            ? `${missedCount} ${missedCount === 1 ? "delas volta" : "delas voltam"} na revisão de amanhã.`
            : "Nenhuma precisou voltar — mandou bem!"}
        </p>
      </section>

      {activity && (
        <p className="mt-4 rounded-2xl bg-sky/40 p-4 text-sm leading-snug">
          {failedCheckpoint
            ? "Refaça o checkpoint pra abrir a próxima unidade. As palavras que você errou já estão na revisão de amanhã."
            : unitDone && nextUnit
              ? `Próxima parada: Unidade ${nextUnit.number} · ${nextUnit.title}.`
              : unitDone
                ? "Você chegou ao fim da trilha por enquanto. Novas unidades em breve."
                : "Sua trilha foi atualizada com este progresso."}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {activity ? (
          <>
            <Link
              to="/trilha"
              className="glass-dark press flex h-14 items-center justify-center gap-2 rounded-full font-medium"
            >
              {failedCheckpoint ? "Voltar à trilha" : "Continuar na trilha"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pratica"
              className="glass press flex h-14 items-center justify-center rounded-full font-medium"
            >
              Usar numa conversa
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/pratica"
              className="glass-dark press flex h-14 items-center justify-center gap-2 rounded-full font-medium"
            >
              Usar numa conversa <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="glass press flex h-14 items-center justify-center rounded-full font-medium"
            >
              Voltar ao início
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
