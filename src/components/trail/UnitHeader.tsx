import { AlignLeft } from "lucide-react";
import type { Section, Unit } from "@/lib/trail";

/** Cabeçalho da unidade: seção, título, objetivo, progresso e o botão que abre as seções. */
export function UnitHeader({
  section,
  unit,
  done,
  total,
  pct,
  onOpenSections,
}: {
  section: Section;
  unit: Unit;
  done: number;
  total: number;
  pct: number;
  onOpenSections: () => void;
}) {
  return (
    <section className="surface relative mt-3 rounded-[2rem] p-6">
      <button
        type="button"
        onClick={onOpenSections}
        aria-label="Ver seções e unidades"
        className="glass press absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full"
      >
        <AlignLeft className="h-5 w-5" />
      </button>
      <p className="pr-14 text-xs font-bold uppercase tracking-wider text-teal-800">
        Seção {section.number} · Unidade {unit.number}
      </p>
      <h1 className="mt-2 pr-10 font-display text-4xl leading-[1.05]">{unit.title}</h1>
      <p className="mt-2 text-[15px] leading-snug text-muted-foreground">{unit.description}</p>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="font-medium">
          {done} de {total} atividades
        </span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso da unidade"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-teal-700 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
