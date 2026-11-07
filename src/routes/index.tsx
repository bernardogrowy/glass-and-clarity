import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Search, ArrowRight, Coffee, Briefcase, Stethoscope, Plane } from "lucide-react";
import { AppShell, GlassIconButton } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hi — Pratique conversas da sua vida real" },
      { name: "description", content: "O Hi transforma situações reais em prática de conversação, vocabulário útil e evolução mensurável." },
      { property: "og:title", content: "Hi — Pratique conversas da sua vida real" },
      { property: "og:description", content: "Escolha a vida que quer viver no novo idioma. O Hi prepara você para conversar nela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const situations = [
  { icon: Coffee, title: "Pedir um café em Londres", time: "5 min", tone: "bg-peach" },
  { icon: Briefcase, title: "Explicar seu trabalho", time: "10 min", tone: "bg-sky" },
  { icon: Stethoscope, title: "Marcar uma consulta", time: "10 min", tone: "bg-mint" },
  { icon: Plane, title: "Check-in no aeroporto", time: "5 min", tone: "bg-lilac" },
];

function Index() {
  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <GlassIconButton label="Buscar"><Search className="h-5 w-5" /></GlassIconButton>
        <span className="font-display text-2xl">Hi.</span>
        <GlassIconButton label="Notificações"><Bell className="h-5 w-5" /></GlassIconButton>
      </header>

      <section className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">Boa tarde, Samson</p>
        <h1 className="mt-2 font-display text-4xl leading-tight">Que conversa você quer viver hoje?</h1>
      </section>

      <article className="surface mt-8 rounded-3xl p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded-full bg-butter px-3 py-1 font-medium text-foreground">Missão do dia</span>
          <span>10 min · B1</span>
        </div>
        <h2 className="mt-5 font-display text-3xl leading-snug">Contar como foi seu fim de semana</h2>
        <p className="mt-2 text-sm text-muted-foreground">Passado simples, conectores e 6 palavras novas para reutilizar.</p>
        <Link to="/pratica" className="glass-dark press mt-6 flex h-14 items-center justify-center gap-2 rounded-full font-medium">
          Começar conversa <ArrowRight className="h-4 w-4" />
        </Link>
      </article>

      <h3 className="mt-10 mb-4 text-sm font-medium text-muted-foreground">Situações reais</h3>
      <div className="grid grid-cols-2 gap-3">
        {situations.map(({ icon: Icon, title, time, tone }) => (
          <Link to="/pratica" key={title} className="surface press rounded-3xl p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="mt-6 font-display text-lg leading-snug">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{time}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
