import { ArrowUp, Check, Lock, Play, X } from "lucide-react";
import { BottomSheet } from "@/components/trail/BottomSheet";
import { SECTIONS, UNITS, type Unit } from "@/lib/trail";
import {
  getAdjacentUnit,
  getUnitProgress,
  getUnitStatus,
  type TrailState,
} from "@/lib/trail-store";
import { cn } from "@/lib/utils";

/** Seções e unidades da trilha: onde a pessoa está, o que já fez e o que ainda está fechado. */
export function SectionSheet({
  open,
  onOpenChange,
  trail,
  viewingUnitId,
  trailName,
  onSelectUnit,
  onBackToCurrent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trail: TrailState;
  viewingUnitId: string | null;
  trailName: string;
  onSelectUnit: (unit: Unit) => void;
  onBackToCurrent: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Seções e unidades"
      className="min-h-[70vh]"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{trailName}</p>
            <h2 className="font-display text-[2rem] leading-tight">Seções e unidades</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="glass press grid h-12 w-12 shrink-0 place-items-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {SECTIONS.map((section) => {
          const sectionOpen =
            section.units.length > 0 && getUnitStatus(trail, section.units[0]!) !== "bloqueada";
          return (
            <div key={section.id} className="mt-6">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold",
                    sectionOpen ? "bg-mint" : "border border-dashed border-foreground/30",
                  )}
                >
                  Seção {section.number}
                </span>
                <h3
                  className={cn(
                    "flex-1 text-lg font-semibold",
                    !sectionOpen && "text-muted-foreground",
                  )}
                >
                  {section.title}
                </h3>
                <span className="text-sm text-muted-foreground">{section.level}</span>
              </div>

              {section.units.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Bloqueada · conclua a Seção {section.number - 1} para abrir. Em breve.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {section.units.map((unit) => {
                    const status = getUnitStatus(trail, unit);
                    const { done, total, pct } = getUnitProgress(trail, unit);
                    const previous = getAdjacentUnit(unit, -1);
                    const isViewing = unit.id === viewingUnitId;
                    const locked = status === "bloqueada";
                    return (
                      <li key={unit.id}>
                        <button
                          type="button"
                          disabled={locked}
                          aria-current={isViewing ? "true" : undefined}
                          onClick={() => onSelectUnit(unit)}
                          className={cn(
                            "press flex w-full items-center gap-4 rounded-3xl p-4 text-left",
                            locked && "border-2 border-dashed border-foreground/25 bg-transparent",
                            !locked && "surface",
                            !locked &&
                              status === "atual" &&
                              "border-2 border-foreground bg-mint/30",
                            isViewing && status === "concluida" && "ring-2 ring-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-12 w-12 shrink-0 place-items-center rounded-full",
                              status === "concluida" && "bg-mint",
                              status === "atual" && "glass-dark",
                              locked && "bg-card",
                            )}
                          >
                            {status === "concluida" ? (
                              <Check className="h-5 w-5" />
                            ) : status === "atual" ? (
                              <Play className="h-5 w-5" />
                            ) : (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block font-semibold leading-snug",
                                locked && "text-muted-foreground",
                              )}
                            >
                              Unidade {unit.number} · {unit.title}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {status === "concluida" && `Concluída · ${done} de ${total}`}
                              {status === "atual" && `Em andamento · ${done} de ${total}`}
                              {locked &&
                                `Bloqueada · passe no checkpoint da Unidade ${previous?.number ?? unit.number - 1}`}
                            </span>
                            {status === "atual" && (
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onBackToCurrent}
          disabled={UNITS.every((u) => getUnitStatus(trail, u) === "concluida")}
          className="glass-dark press mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full font-medium disabled:opacity-50"
        >
          <ArrowUp className="h-4 w-4" /> Voltar à atividade atual
        </button>
      </div>
    </BottomSheet>
  );
}
