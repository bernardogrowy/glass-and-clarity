import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  COMPETENCY_INFO,
  COMPETENCY_LIST,
  createGoal,
  previewSteps,
  type Competency,
} from "@/lib/progress-store";

const TIME_OPTIONS = [5, 10, 15, 21, 30] as const;
const TOTAL_STEPS = 6;

function emptyForm() {
  return {
    objetivo: "",
    situacao: "",
    prazo: "",
    frequenciaPorSemana: 3,
    tempoDisponivel: 10 as 5 | 10 | 15 | 21 | 30,
    competencias: [] as Competency[],
    confiancaAtual: 3 as 1 | 2 | 3 | 4 | 5,
  };
}

export function GoalWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());

  const close = () => {
    onOpenChange(false);
    setStep(0);
    setForm(emptyForm());
  };

  const toggleCompetencia = (c: Competency) => {
    setForm((f) => ({
      ...f,
      competencias: f.competencias.includes(c)
        ? f.competencias.filter((x) => x !== c)
        : [...f.competencias, c],
    }));
  };

  const finish = () => {
    createGoal(form);
    toast.success("Meta criada");
    close();
  };

  const canAdvance = [
    form.objetivo.trim().length > 0,
    form.situacao.trim().length > 0,
    form.prazo.length > 0,
    form.frequenciaPorSemana > 0,
    form.competencias.length > 0,
    true,
  ][step];

  const steps = previewSteps(form);

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col overflow-y-auto rounded-t-3xl border-none bg-background"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Nova meta</SheetTitle>
        </SheetHeader>

        <div className="mt-2 flex-1">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">O que você quer conseguir fazer?</p>
              <textarea
                autoFocus
                value={form.objetivo}
                onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))}
                placeholder="Ex: Participar de uma reunião em inglês sem depender de tradução"
                className="min-h-24 w-full rounded-2xl bg-muted px-4 py-3 outline-none"
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Em qual situação?</p>
              <input
                autoFocus
                value={form.situacao}
                onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
                placeholder="Ex: Reunião semanal de trabalho"
                className="h-12 w-full rounded-2xl bg-muted px-4 outline-none"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Até quando?</p>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                className="h-12 w-full rounded-2xl bg-muted px-4 outline-none"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Quantos dias por semana você consegue praticar?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm((f) => ({ ...f, frequenciaPorSemana: n }))}
                      className={`press grid h-10 w-10 place-items-center rounded-full text-sm font-medium ${
                        form.frequenciaPorSemana === n
                          ? "glass-dark"
                          : "glass text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quanto tempo por sessão?</p>
                <div className="glass mt-3 flex rounded-full p-1">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, tempoDisponivel: t }))}
                      className={`press h-10 flex-1 rounded-full text-sm font-medium ${
                        form.tempoDisponivel === t ? "glass-dark" : "text-muted-foreground"
                      }`}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Quais competências essa meta envolve?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMPETENCY_LIST.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCompetencia(c)}
                    className={`press rounded-full px-4 py-2 text-sm font-medium ${
                      form.competencias.includes(c) ? "glass-dark" : "glass text-muted-foreground"
                    }`}
                  >
                    {COMPETENCY_INFO[c].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Quão confiante você se sente hoje nessa meta?
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      setForm((f) => ({ ...f, confiancaAtual: n as 1 | 2 | 3 | 4 | 5 }))
                    }
                    className={`press h-12 flex-1 rounded-2xl text-sm font-medium ${
                      form.confiancaAtual === n ? "glass-dark" : "glass text-muted-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                1 = nada confiante · 5 = muito confiante
              </p>

              <div className="surface mt-6 rounded-3xl p-4">
                <p className="text-sm font-medium">O Hi vai sugerir essas etapas:</p>
                <ul className="mt-3 space-y-2">
                  {steps.map((s) => (
                    <li key={s.id} className="text-sm text-muted-foreground">
                      • {s.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="glass press h-12 flex-1 rounded-2xl font-medium"
            >
              Voltar
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="glass-dark press h-12 flex-[2] rounded-2xl font-medium disabled:opacity-50"
            >
              Avançar
            </button>
          ) : (
            <button
              onClick={finish}
              className="glass-dark press h-12 flex-[2] rounded-2xl font-medium"
            >
              Criar meta
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
