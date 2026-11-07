import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/vocabulario")({
  head: () => ({
    meta: [
      { title: "Vocabulário — Hi" },
      { name: "description", content: "Palavras úteis que voltam nas suas próximas conversas." },
      { property: "og:title", content: "Vocabulário — Hi" },
      { property: "og:description", content: "Palavras úteis que voltam nas suas próximas conversas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Vocab,
});

const words = [
  ["Grab a coffee", "tomar um café", "Fim de semana"],
  ["Hang out", "passar tempo junto", "Fim de semana"],
  ["Deadline", "prazo", "Trabalho"],
  ["Appointment", "consulta marcada", "Saúde"],
  ["Boarding pass", "cartão de embarque", "Viagem"],
];

function Vocab() {
  return (
    <AppShell>
      <h1 className="font-display text-4xl leading-tight">Palavras para<br />a vida real</h1>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="glass press flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"><Plus className="h-4 w-4" />Favoritar</button>
        <Link to="/flashcards" className="glass press flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"><Layers className="h-4 w-4" />Criar flashcards</Link>
      </div>
      <div className="mt-8 flex gap-10">
        <div><p className="font-display text-3xl">18%</p><p className="text-xs text-muted-foreground">Dominadas</p></div>
        <div><p className="font-display text-3xl">64</p><p className="text-xs text-muted-foreground">No deck</p></div>
      </div>
      <h2 className="mt-10 mb-4 font-display text-2xl">Palavras ({words.length})</h2>
      <ul className="surface divide-y divide-border rounded-3xl">
        {words.map(([en, pt, ctx]) => (
          <li key={en} className="flex items-center justify-between px-5 py-4">
            <div><p className="font-medium">{en}</p><p className="text-sm text-muted-foreground">{pt}</p></div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{ctx}</span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
