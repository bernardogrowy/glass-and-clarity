import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Timer, Star, Volume2, Lightbulb, Plus, X, Check, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Hi" },
      { name: "description", content: "Crie flashcards e revise suas palavras com check-up final." },
      { property: "og:title", content: "Flashcards — Hi" },
      { property: "og:description", content: "Crie flashcards e revise suas palavras com check-up final." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Flashcards,
});

type Card = { en: string; pt: string; ex: string };
const seed: Card[] = [
  { en: "Grab a coffee", pt: "tomar um café", ex: "Do you want to grab a coffee after work?" },
  { en: "Deadline", pt: "prazo", ex: "The deadline for the report is Friday." },
  { en: "Boarding pass", pt: "cartão de embarque", ex: "Please show your boarding pass at the gate." },
  { en: "Hang out", pt: "passar tempo junto", ex: "We usually hang out at the park." },
];
const tones = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac"];

function Flashcards() {
  const [phase, setPhase] = useState<"create" | "study" | "done">("create");
  const [cards, setCards] = useState<Card[]>(seed);
  const [en, setEn] = useState("");
  const [pt, setPt] = useState("");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (phase !== "study") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const start = () => { setI(0); setResults([]); setSecs(0); setFlipped(false); setPhase("study"); };
  const answer = (ok: boolean) => {
    const r = [...results, ok];
    setResults(r);
    setFlipped(false);
    if (i + 1 >= cards.length) setPhase("done"); else setI(i + 1);
  };

  const header = (title: string) => (
    <div className="flex items-center justify-between">
      <Link to="/vocabulario" aria-label="Voltar" className="glass press grid h-11 w-11 place-items-center rounded-full"><ChevronLeft className="h-5 w-5" /></Link>
      <p className="font-medium">{title}</p>
      <div className="h-11 w-11" />
    </div>
  );

  if (phase === "create") return (
    <AppShell hideTabs>
      {header("Novo deck")}
      <h1 className="mt-6 font-display text-4xl leading-tight">Crie seus<br />flashcards</h1>
      <div className="surface mt-6 space-y-3 rounded-3xl p-5">
        <input value={en} onChange={(e) => setEn(e.target.value)} placeholder="Palavra em inglês" className="h-12 w-full rounded-2xl bg-muted px-4 outline-none" />
        <input value={pt} onChange={(e) => setPt(e.target.value)} placeholder="Tradução" className="h-12 w-full rounded-2xl bg-muted px-4 outline-none" />
        <button
          onClick={() => { if (!en || !pt) return; setCards([...cards, { en, pt, ex: "" }]); setEn(""); setPt(""); }}
          className="glass press flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium"
        ><Plus className="h-4 w-4" />Adicionar card</button>
      </div>
      <h2 className="mt-8 mb-3 font-display text-2xl">No deck ({cards.length})</h2>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, k) => (
          <div key={c.en + k} className={`${tones[k % 4]} relative rounded-3xl p-4`}>
            <button aria-label="Remover" onClick={() => setCards(cards.filter((_, j) => j !== k))} className="absolute right-3 top-3 text-foreground/50"><X className="h-4 w-4" /></button>
            <p className="font-display text-lg leading-tight">{c.en}</p>
            <p className="mt-1 text-xs text-foreground/60">{c.pt}</p>
          </div>
        ))}
      </div>
      <button disabled={!cards.length} onClick={start} className="glass-dark press fixed bottom-6 left-1/2 h-14 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-full font-medium disabled:opacity-50">
        Começar revisão
      </button>
    </AppShell>
  );

  if (phase === "study") {
    const c = cards[i];
    return (
      <AppShell hideTabs>
        {header("Praticar")}
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4" />{i + 1} de {cards.length}</span>
          <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" />{fmt(secs)}</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(i / cards.length) * 100}%` }} />
        </div>
        <div className="relative mx-auto mt-10 aspect-square w-[85%]">
          <div className="absolute inset-0 translate-x-2 -translate-y-3 rotate-3 rounded-[2rem] bg-sky/60" />
          <div className="absolute inset-0 translate-x-1 -translate-y-1.5 rotate-1 rounded-[2rem] bg-sky" />
          <button onClick={() => setFlipped(!flipped)} className="press absolute inset-0 flex -rotate-3 bg-primary text-primary-foreground shadow-xl flex-col items-center justify-center rounded-[2rem] p-6 text-center">
            <span className="glass absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-foreground"><Volume2 className="h-4 w-4" /></span>
            <p className="font-display text-4xl">{flipped ? c.pt : c.en}</p>
            <p className="mt-6 text-xs opacity-60">{flipped ? "toque para ver a palavra" : "toque para ver a tradução"}</p>
          </button>
        </div>
        {c.ex && (
          <div className="surface mt-10 rounded-3xl p-5">
            <p className="flex items-center gap-2 font-medium"><Lightbulb className="h-4 w-4" />Palavra em uso</p>
            <p className="mt-2 text-sm italic text-muted-foreground">{c.ex}</p>
          </div>
        )}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button onClick={() => answer(false)} className="glass press flex h-14 items-center justify-center gap-2 rounded-full font-medium text-destructive"><X className="h-5 w-5" />Errei</button>
          <button onClick={() => answer(true)} className="glass-tint press flex h-14 items-center justify-center gap-2 rounded-full font-medium"><Check className="h-5 w-5" />Acertei</button>
        </div>
      </AppShell>
    );
  }

  const right = results.filter(Boolean).length;
  const wrong = results.length - right;
  const pct = Math.round((right / results.length) * 100);
  return (
    <AppShell hideTabs>
      {header("Check-up")}
      <div className="mt-8 text-center">
        <div className="mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--muted) 0)` }}>
          <div className="grid h-32 w-32 place-items-center rounded-full bg-card">
            <p className="font-display text-4xl">{pct}%</p>
          </div>
        </div>
        <h1 className="mt-6 font-display text-3xl">{pct >= 70 ? "Mandou bem!" : "Continue praticando"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Revisão do deck concluída</p>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-sky p-4 text-center"><Timer className="mx-auto h-5 w-5" /><p className="mt-2 font-display text-2xl">{fmt(secs)}</p><p className="text-xs text-foreground/60">Tempo</p></div>
        <div className="rounded-3xl bg-mint p-4 text-center"><Check className="mx-auto h-5 w-5" /><p className="mt-2 font-display text-2xl">{right}</p><p className="text-xs text-foreground/60">Acertos</p></div>
        <div className="rounded-3xl bg-peach p-4 text-center"><X className="mx-auto h-5 w-5" /><p className="mt-2 font-display text-2xl">{wrong}</p><p className="text-xs text-foreground/60">Erros</p></div>
      </div>
      <ul className="surface mt-6 divide-y divide-border rounded-3xl">
        {cards.map((c, k) => (
          <li key={c.en + k} className="flex items-center justify-between px-5 py-3">
            <div><p className="font-medium">{c.en}</p><p className="text-xs text-muted-foreground">{c.pt}</p></div>
            {results[k] ? <Check className="h-5 w-5 text-accent" /> : <X className="h-5 w-5 text-destructive" />}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={start} className="glass press flex h-14 items-center justify-center gap-2 rounded-full font-medium"><RotateCcw className="h-4 w-4" />Refazer</button>
        <Link to="/vocabulario" className="glass-dark press flex h-14 items-center justify-center rounded-full font-medium">Concluir</Link>
      </div>
    </AppShell>
  );
}
