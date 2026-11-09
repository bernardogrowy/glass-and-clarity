import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  CalendarCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getStreakInsight, getStreakTier, isDateActive, useStreakStore } from "@/lib/streak-store";

export const Route = createFileRoute("/streak")({
  head: () => ({
    meta: [
      { title: "Sequência — Hi" },
      {
        name: "description",
        content: "Veja sua sequência de dias praticados e seu histórico do mês.",
      },
      { property: "og:title", content: "Sequência — Hi" },
      {
        property: "og:description",
        content: "Veja sua sequência de dias praticados e seu histórico do mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StreakPage,
});

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(monthStart: Date): (Date | null)[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1),
    ),
  ];
}

function StreakPage() {
  const navigate = useNavigate();
  const streak = useStreakStore();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const today = new Date();
  const isCurrentMonth =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  const cells = buildMonthGrid(viewMonth);
  const practicedInMonth = cells.filter((d) => d && isDateActive(streak, d)).length;

  const share = async () => {
    const text = `Estou numa sequência de ${streak.current} dia${streak.current === 1 ? "" : "s"} praticando no Hi!`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copiado! Cola onde quiser compartilhar.");
      }
    } catch {
      // usuário cancelou o compartilhamento — não é um erro
    }
  };

  return (
    <AppShell hideTabs>
      <div className="bg-peach -mx-5 -mt-6 rounded-b-[2.5rem] px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/" })}
            aria-label="Fechar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="font-medium">Sequência</p>
          <button
            onClick={share}
            aria-label="Compartilhar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 text-center">
          <span className="bg-butter rounded-full px-3 py-1 text-xs font-medium text-foreground">
            {getStreakTier(streak.current)}
          </span>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Flame className="h-12 w-12" />
            <p className="font-display text-6xl">{streak.current}</p>
          </div>
          <p className="mt-1 text-lg">
            dia{streak.current === 1 ? "" : "s"} seguido{streak.current === 1 ? "" : "s"}!
          </p>
        </div>
      </div>

      <div className="glass-dark mt-6 rounded-3xl p-4 text-sm">{getStreakInsight(streak)}</div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="surface rounded-3xl p-4">
          <div className="bg-mint grid h-10 w-10 place-items-center rounded-2xl">
            <CalendarCheck className="h-4 w-4 text-foreground/70" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Dias praticados</p>
          <p className="font-display text-xl">{streak.activeDates.length}</p>
        </div>
        <div className="surface rounded-3xl p-4">
          <div className="bg-lilac grid h-10 w-10 place-items-center rounded-2xl">
            <Trophy className="h-4 w-4 text-foreground/70" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Maior sequência</p>
          <p className="font-display text-xl">
            {streak.longest} dia{streak.longest === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="surface mt-6 rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            aria-label="Mês anterior"
            className="press grid h-8 w-8 place-items-center rounded-full text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-medium">
            {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </p>
          <button
            onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            disabled={isCurrentMonth}
            aria-label="Próximo mês"
            className="press grid h-8 w-8 place-items-center rounded-full text-muted-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {practicedInMonth} dia{practicedInMonth === 1 ? "" : "s"} praticado
          {practicedInMonth === 1 ? "" : "s"} nesse mês
        </p>

        <div className="mt-4 grid grid-cols-7 gap-y-2 text-center">
          {WEEKDAY_LABELS.map((l, i) => (
            <span key={i} className="text-[11px] text-muted-foreground">
              {l}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`empty-${i}`} />;
            const active = isDateActive(streak, d);
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={d.toISOString()} className="flex justify-center">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : isToday
                        ? "glass-dark font-medium"
                        : "text-muted-foreground"
                  }`}
                >
                  {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
