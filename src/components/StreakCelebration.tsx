import { Flame } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const WEEKDAY_INITIALS = ["S", "T", "Q", "Q", "S", "S", "D"];

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

export function StreakCelebration({
  streak,
  open,
  onOpenChange,
}: {
  streak: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const today = new Date();
  const week = getWeekDates(today);
  const todayIndex = week.findIndex((d) => d.toDateString() === today.toDateString());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface max-w-sm gap-0 rounded-3xl border-none p-6 text-center">
        <div className="bg-peach mx-auto grid h-20 w-20 place-items-center rounded-full">
          <Flame className="h-10 w-10 text-foreground" />
        </div>
        <h2 className="mt-4 font-display text-3xl">
          {streak} dia{streak === 1 ? "" : "s"} seguidos!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {streak <= 1 ? "Uma nova sequência começou hoje." : "Continue assim — cada dia conta."}
        </p>

        <div className="surface mt-6 flex justify-between rounded-2xl p-3">
          {week.map((d, i) => {
            const offset = i - todayIndex;
            const isDone = offset <= 0 && offset > -streak;
            return (
              <div key={d.toISOString()} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{WEEKDAY_INITIALS[i]}</span>
                {isDone ? (
                  <span className="bg-accent text-accent-foreground grid h-8 w-8 place-items-center rounded-full">
                    <Flame className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs text-muted-foreground">
                    {d.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="glass-dark press mt-6 flex h-12 w-full items-center justify-center rounded-2xl font-medium"
        >
          Continuar
        </button>
      </DialogContent>
    </Dialog>
  );
}
