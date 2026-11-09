import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { updateSrsSettings, type SrsSettings } from "@/lib/flashcards-store";

export function SrsSettingsSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SrsSettings;
}) {
  const [dificil, setDificil] = useState(settings.dificilDays);
  const [medio, setMedio] = useState(settings.medioDays);
  const [facil, setFacil] = useState(settings.facilDays);

  useEffect(() => {
    setDificil(settings.dificilDays);
    setMedio(settings.medioDays);
    setFacil(settings.facilDays);
  }, [settings]);

  const save = () => {
    updateSrsSettings({
      dificilDays: Math.max(0, dificil),
      medioDays: Math.max(0, medio),
      facilDays: Math.max(0, facil),
    });
    onOpenChange(false);
    toast.success("Configurações salvas");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-none bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Repetição espaçada</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Em quantos dias um card volta pra revisão, de acordo com a sua resposta.
        </p>
        <div className="mt-4 space-y-3">
          <IntervalField label="Difícil" value={dificil} onChange={setDificil} />
          <IntervalField label="Médio" value={medio} onChange={setMedio} />
          <IntervalField label="Fácil" value={facil} onChange={setFacil} />
        </div>
        <button
          onClick={save}
          className="glass-dark press mt-6 flex h-12 w-full items-center justify-center rounded-2xl font-medium"
        >
          Salvar
        </button>
      </SheetContent>
    </Sheet>
  );
}

function IntervalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="surface flex items-center justify-between rounded-2xl px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-10 w-16 rounded-xl bg-muted text-center outline-none"
        />
        <span className="text-xs text-muted-foreground">dias</span>
      </div>
    </div>
  );
}
