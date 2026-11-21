import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/trail/BottomSheet";
import {
  SLOT_MINUTE_OPTIONS,
  describeBlockWhen,
  focusLabel,
  recordCheckin,
  updateSlot,
  useStudyPlan,
  type CheckinOutcome,
} from "@/lib/study-plan-store";

export type MissedTarget = { date: string; slotId: string };

const optionClass =
  "surface press h-14 w-full rounded-full border border-foreground/10 px-5 text-[15px] font-medium";

/**
 * Folha "Bloco perdido": a pergunta sobre o plano quando um bloco não aconteceu. As respostas só
 * ajustam o plano (horário, duração ou nada) — sem culpa, sem falar de sequência.
 */
export function MissedBlockSheet({
  target,
  onClose,
}: {
  target: MissedTarget | null;
  onClose: () => void;
}) {
  const plan = useStudyPlan();
  const [step, setStep] = useState<"escolher" | "horario">("escolher");
  const [time, setTime] = useState("");
  const slot = target ? plan.slots.find((s) => s.id === target.slotId) : undefined;

  useEffect(() => {
    setStep("escolher");
    setTime(slot?.time ?? "");
    // Reinicia só quando o alvo muda (o `slot` muda junto com ele).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.date, target?.slotId]);

  const open = !!target && !!slot;
  const now = new Date();

  const answer = (outcome: CheckinOutcome, message: string) => {
    if (!target) return;
    recordCheckin(target.date, target.slotId, outcome);
    toast(message);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Bloco perdido"
      description="Conte o que aconteceu com esse bloco para eu ajustar o seu plano."
    >
      {target && slot && (
        <div className="px-6 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-sky px-3 py-1 text-xs font-bold">
              Mentor · {describeBlockWhen(target.date, slot.time, now)}
            </span>
            <span className="text-sm text-muted-foreground">{slot.minutes} min</span>
          </div>
          <h2 className="mt-5 font-display text-3xl leading-tight">
            Bloco perdido: {focusLabel(plan, slot)}
          </h2>

          {step === "escolher" ? (
            <>
              <p className="mt-2 text-[15px] text-muted-foreground">
                O que aconteceu com esse bloco?
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  className={optionClass}
                  onClick={() =>
                    answer(
                      "imprevisto",
                      "Anotado. Imprevistos acontecem — o plano continua o mesmo.",
                    )
                  }
                >
                  Foi um imprevisto
                </button>
                <button
                  type="button"
                  className={optionClass}
                  onClick={() => answer("adiado", "Combinado: faça o bloco quando puder hoje.")}
                >
                  Vou repor ainda hoje
                </button>
                <button type="button" className={optionClass} onClick={() => setStep("horario")}>
                  Esse horário não funciona
                </button>
                <button
                  type="button"
                  className={optionClass}
                  onClick={() => {
                    const smaller = [...SLOT_MINUTE_OPTIONS]
                      .reverse()
                      .find((m) => m < slot.minutes);
                    if (smaller) {
                      updateSlot(slot.id, { minutes: smaller });
                      answer(
                        "puxado",
                        `Pronto: esse bloco agora tem ${smaller} min. Melhor pouco e constante.`,
                      );
                    } else {
                      answer(
                        "puxado",
                        "Esse já é o bloco mais curto. Se continuar puxado, mude o horário.",
                      );
                    }
                  }}
                >
                  Está puxado demais
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <label className="block text-[15px] font-medium">
                Que horário cabe melhor?
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-input bg-background/70 px-4 text-[15px]"
                />
              </label>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  className="glass-dark press h-14 flex-1 rounded-full text-[15px] font-medium"
                  onClick={() => {
                    if (time) updateSlot(slot.id, { time });
                    answer("horario", time ? `Contrato ajustado para ${time}.` : "Anotado.");
                  }}
                >
                  Salvar novo horário
                </button>
                <button
                  type="button"
                  className="glass press h-14 rounded-full px-6 text-[15px] font-medium"
                  onClick={() => setStep("escolher")}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Sem pressão — sua resposta só ajusta o plano.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
