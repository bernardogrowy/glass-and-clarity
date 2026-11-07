import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/progresso")({
  head: () => ({
    meta: [
      { title: "Progresso — Hi" },
      { name: "description", content: "Veja o que você já consegue fazer no novo idioma." },
      { property: "og:title", content: "Progresso — Hi" },
      { property: "og:description", content: "Veja o que você já consegue fazer no novo idioma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Progresso,
});

const skills = [
  ["Marcar uma consulta", true],
  ["Pedir comida em um restaurante", true],
  ["Explicar seu trabalho", false],
  ["Contar uma história", false],
] as const;

function Progresso() {
  return (
    <AppShell>
      <p className="text-sm text-muted-foreground">Sua semana</p>
      <h1 className="mt-1 font-display text-4xl">Você está evoluindo.</h1>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="surface rounded-3xl bg-mint p-5"><p className="text-xs">Minutos falando</p><p className="mt-6 font-display text-5xl">42</p></div>
        <div className="surface rounded-3xl bg-peach p-5"><p className="text-xs">Sequência</p><p className="mt-6 font-display text-5xl">6<span className="text-lg"> dias</span></p></div>
      </div>
      <h2 className="mt-10 mb-4 font-display text-2xl">Você já consegue…</h2>
      <ul className="space-y-3">
        {skills.map(([s, done]) => (
          <li key={s} className="surface flex items-center gap-4 rounded-3xl px-5 py-4">
            <span className={`grid h-8 w-8 place-items-center rounded-full ${done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}><Check className="h-4 w-4" /></span>
            <span className={done ? "" : "text-muted-foreground"}>{s}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
