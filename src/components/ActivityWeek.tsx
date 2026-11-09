import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const dayLabels = ["S", "T", "Q", "Q", "S", "S", "D"];

function getWeekDates(reference: Date) {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

// Mock de dias praticados nesta semana — usado só quando nenhum dado real é passado via prop.
const mockPracticedOffsets = [0, 1, 2, 4];

export function ActivityWeek({ practicedDates }: { practicedDates?: Date[] }) {
  const today = new Date();
  const week = getWeekDates(today);
  const todayIndex = week.findIndex((d) => sameDay(d, today));
  const practicedOffsets = practicedDates
    ? week.reduce<number[]>((offsets, day, i) => {
        if (practicedDates.some((d) => sameDay(d, day))) offsets.push(i);
        return offsets;
      }, [])
    : mockPracticedOffsets;
  const practicedCount = practicedOffsets.filter((i) => i <= todayIndex).length;

  return (
    <section className="surface mt-8 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sua semana</p>
          <p className="mt-0.5 font-display text-lg leading-snug">Cada dia conta</p>
        </div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-medium text-foreground">
          {practicedCount}/7 dias
        </span>
      </div>

      <div className="mt-5 flex justify-between">
        {week.map((d, i) => {
          const isToday = i === todayIndex;
          const isFuture = i > todayIndex;
          const practiced = practicedOffsets.includes(i) && !isFuture;

          return (
            <div key={d.toISOString()} className="flex flex-col items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{dayLabels[i]}</span>
              <div className="relative">
                <div
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full text-sm",
                    isToday && "glass-dark font-medium",
                    !isToday && practiced && "bg-accent text-accent-foreground",
                    !isToday && !practiced && !isFuture && "bg-muted text-muted-foreground",
                    !isToday && isFuture && "text-muted-foreground/50",
                  )}
                >
                  {d.getDate()}
                </div>
                {practiced && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-foreground ring-2 ring-[var(--card)]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Sem pressão — um dia parado não apaga o que você já aprendeu.
      </p>
    </section>
  );
}
