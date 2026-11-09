import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Timer,
  Volume2,
  Lightbulb,
  Plus,
  X,
  Check,
  Minus,
  RotateCcw,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StreakCelebration } from "@/components/StreakCelebration";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { speak } from "@/lib/speech";
import { registerActivity } from "@/lib/streak-store";
import { toast } from "sonner";
import {
  addCard,
  deleteCard,
  getDeckCards,
  getDueCards,
  reviewCard,
  updateCard,
  useFlashcardsStore,
  type Card,
  type Difficulty,
} from "@/lib/flashcards-store";

export const Route = createFileRoute("/flashcards/$deckId")({
  head: () => ({
    meta: [
      { title: "Flashcards — Hi" },
      { name: "description", content: "Revise um baralho de flashcards com repetição espaçada." },
      { property: "og:title", content: "Flashcards — Hi" },
      {
        property: "og:description",
        content: "Revise um baralho de flashcards com repetição espaçada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeckWorkspace,
});

const CARD_TONES = ["bg-mint", "bg-sky", "bg-peach", "bg-lilac"];
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  dificil: "Difícil",
  medio: "Médio",
  facil: "Fácil",
};

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function DeckWorkspace() {
  const { deckId } = Route.useParams();
  const navigate = useNavigate();
  const state = useFlashcardsStore();
  const deck = state.decks.find((d) => d.id === deckId);

  const [phase, setPhase] = useState<"manage" | "study" | "done">("manage");

  // card create/edit dialog
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");

  // study session
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [queue, setQueue] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [secs, setSecs] = useState(0);
  const [log, setLog] = useState<{ card: Card; difficulty: Difficulty }[]>([]);
  const [streakInfo, setStreakInfo] = useState<number | null>(null);

  useEffect(() => {
    if (!deck) navigate({ to: "/baralhos" });
  }, [deck, navigate]);

  useEffect(() => {
    if (phase !== "study") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "study" && queue.length === 0 && sessionCards.length > 0) setPhase("done");
  }, [phase, queue, sessionCards]);

  useEffect(() => {
    if (phase !== "done") return;
    const result = registerActivity();
    if (result.isFirstToday) setStreakInfo(result.streak);
  }, [phase]);

  if (!deck) return null;

  const deckCards = getDeckCards(state, deckId);
  const dueCards = getDueCards(state, deckId);

  const header = (title: string, onBack?: () => void) => (
    <div className="flex items-center justify-between">
      {onBack ? (
        <button
          aria-label="Voltar"
          onClick={onBack}
          className="glass press grid h-11 w-11 place-items-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link
          to="/baralhos"
          aria-label="Voltar"
          className="glass press grid h-11 w-11 place-items-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <p className="font-medium">{title}</p>
      <div className="h-11 w-11" />
    </div>
  );

  const openNewCard = () => {
    setEditingCard(null);
    setFront("");
    setBack("");
    setExample("");
    setCardDialogOpen(true);
  };

  const openEditCard = (c: Card) => {
    setEditingCard(c);
    setFront(c.front);
    setBack(c.back);
    setExample(c.example ?? "");
    setCardDialogOpen(true);
  };

  const saveCard = () => {
    const data = { front: front.trim(), back: back.trim(), example: example.trim() || undefined };
    if (!data.front || !data.back) return;
    if (editingCard) updateCard(editingCard.id, data);
    else addCard(deckId, data);
    toast.success(editingCard ? "Card atualizado" : "Card adicionado");
    setCardDialogOpen(false);
  };

  const beginSession = (base: Card[]) => {
    setSessionCards(base);
    setQueue(base);
    setLog([]);
    setSecs(0);
    setFlipped(false);
    setPhase("study");
  };

  const answer = (difficulty: Difficulty) => {
    const current = queue[0];
    if (!current) return;
    reviewCard(current.id, difficulty);
    setLog((l) => [...l, { card: current, difficulty }]);
    setFlipped(false);
    setQueue((q) => {
      const rest = q.slice(1);
      return difficulty === "facil" ? rest : [...rest, current];
    });
  };

  if (phase === "manage") {
    return (
      <AppShell hideTabs>
        {header(deck.name)}
        <h1 className="mt-6 font-display text-4xl leading-tight">{deck.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {deckCards.length} card{deckCards.length === 1 ? "" : "s"} · {dueCards.length} pra revisar
          hoje
        </p>

        <button
          onClick={openNewCard}
          className="glass press mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Adicionar card
        </button>

        {deckCards.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 pb-28">
            {deckCards.map((c, k) => (
              <div
                key={c.id}
                className={`${CARD_TONES[k % CARD_TONES.length]} relative rounded-3xl p-4`}
              >
                <button
                  aria-label="Remover"
                  onClick={() => deleteCard(c.id)}
                  className="absolute right-3 top-3 text-foreground/50"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  aria-label={`Editar ${c.front}`}
                  onClick={() => openEditCard(c)}
                  className="press w-full text-left"
                >
                  <p className="font-display text-lg leading-tight pr-6">{c.front}</p>
                  <p className="mt-1 text-xs text-foreground/60">{c.back}</p>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface mt-6 rounded-3xl p-6 text-center text-sm text-muted-foreground">
            <Layers className="mx-auto mb-3 h-6 w-6" />
            Esse baralho ainda não tem cards.
          </div>
        )}

        {dueCards.length > 0 ? (
          <button
            onClick={() => beginSession(dueCards)}
            className="glass-dark press fixed bottom-6 left-1/2 h-14 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 rounded-full font-medium"
          >
            Começar revisão ({dueCards.length})
          </button>
        ) : deckCards.length > 0 ? (
          <div className="fixed bottom-6 left-1/2 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 text-center">
            <p className="mb-2 text-xs text-muted-foreground">Tudo revisado por hoje</p>
            <button
              onClick={() => beginSession(deckCards)}
              className="glass press h-12 w-full rounded-full text-sm font-medium"
            >
              Revisar mesmo assim
            </button>
          </div>
        ) : null}

        <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
          <DialogContent className="surface rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {editingCard ? "Editar card" : "Novo card"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder="Palavra ou frase"
                  className="h-12 flex-1 rounded-2xl bg-muted px-4 outline-none"
                />
                <button
                  type="button"
                  aria-label="Testar pronúncia"
                  onClick={() => speak(front)}
                  disabled={!front.trim()}
                  className="glass press grid h-12 w-12 shrink-0 place-items-center rounded-2xl disabled:opacity-40"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <input
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Tradução"
                className="h-12 w-full rounded-2xl bg-muted px-4 outline-none"
              />
              <textarea
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Frase de exemplo (opcional)"
                className="min-h-20 w-full rounded-2xl bg-muted px-4 py-3 outline-none"
              />
            </div>
            <DialogFooter>
              <button
                onClick={saveCard}
                disabled={!front.trim() || !back.trim()}
                className="glass-dark press flex h-12 w-full items-center justify-center rounded-2xl font-medium disabled:opacity-50"
              >
                {editingCard ? "Salvar" : "Adicionar"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    );
  }

  if (phase === "study") {
    const current = queue[0];
    if (!current) return null;
    return (
      <AppShell hideTabs>
        {header("Revisão", () => setPhase("manage"))}
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {queue.length} na fila
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4" />
            {fmt(secs)}
          </span>
        </div>
        <div className="relative mx-auto mt-10 aspect-square w-[85%]">
          <div className="absolute inset-0 translate-x-2 -translate-y-3 rotate-3 rounded-[2rem] bg-sky/60" />
          <div className="absolute inset-0 translate-x-1 -translate-y-1.5 rotate-1 rounded-[2rem] bg-sky" />
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
            }}
            className="press absolute inset-0 flex -rotate-3 cursor-pointer flex-col items-center justify-center rounded-[2rem] bg-primary p-6 text-center text-primary-foreground shadow-xl"
          >
            <button
              type="button"
              aria-label="Ouvir pronúncia"
              onClick={(e) => {
                e.stopPropagation();
                speak(current.front);
              }}
              className="glass absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-foreground"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <p className="font-display text-4xl">{flipped ? current.back : current.front}</p>
            <p className="mt-6 text-xs opacity-60">
              {flipped ? "toque para ver a palavra" : "toque para ver a tradução"}
            </p>
          </div>
        </div>
        {current.example && (
          <div className="surface mt-10 rounded-3xl p-5">
            <p className="flex items-center gap-2 font-medium">
              <Lightbulb className="h-4 w-4" />
              Palavra em uso
            </p>
            <p className="mt-2 text-sm italic text-muted-foreground">{current.example}</p>
          </div>
        )}
        <div className="mt-8 grid grid-cols-3 gap-2">
          <button
            onClick={() => answer("dificil")}
            className="glass press flex h-14 flex-col items-center justify-center gap-1 rounded-full text-sm font-medium text-destructive"
          >
            <X className="h-4 w-4" />
            Difícil
          </button>
          <button
            onClick={() => answer("medio")}
            className="glass press flex h-14 flex-col items-center justify-center gap-1 rounded-full text-sm font-medium"
          >
            <Minus className="h-4 w-4" />
            Médio
          </button>
          <button
            onClick={() => answer("facil")}
            className="glass-tint press flex h-14 flex-col items-center justify-center gap-1 rounded-full text-sm font-medium"
          >
            <Check className="h-4 w-4" />
            Fácil
          </button>
        </div>
      </AppShell>
    );
  }

  const counts = {
    dificil: log.filter((l) => l.difficulty === "dificil").length,
    medio: log.filter((l) => l.difficulty === "medio").length,
    facil: log.filter((l) => l.difficulty === "facil").length,
  };

  return (
    <AppShell hideTabs>
      {header("Resumo", () => setPhase("manage"))}
      <div className="mt-8 text-center">
        <h1 className="font-display text-3xl">Sessão concluída!</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fmt(secs)} de revisão</p>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-3xl bg-peach p-4 text-center">
          <p className="font-display text-2xl">{counts.dificil}</p>
          <p className="text-xs text-foreground/60">Difícil</p>
        </div>
        <div className="rounded-3xl bg-butter p-4 text-center">
          <p className="font-display text-2xl">{counts.medio}</p>
          <p className="text-xs text-foreground/60">Médio</p>
        </div>
        <div className="rounded-3xl bg-mint p-4 text-center">
          <p className="font-display text-2xl">{counts.facil}</p>
          <p className="text-xs text-foreground/60">Fácil</p>
        </div>
      </div>
      <ul className="surface mt-6 divide-y divide-border rounded-3xl">
        {log.map((l, k) => (
          <li key={l.card.id + k} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="font-medium">{l.card.front}</p>
              <p className="text-xs text-muted-foreground">{l.card.back}</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {DIFFICULTY_LABEL[l.difficulty]}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => beginSession(sessionCards)}
          className="glass press flex h-14 items-center justify-center gap-2 rounded-full font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          Revisar de novo
        </button>
        <button
          onClick={() => setPhase("manage")}
          className="glass-dark press flex h-14 items-center justify-center rounded-full font-medium"
        >
          Concluir
        </button>
      </div>

      <StreakCelebration
        streak={streakInfo ?? 0}
        open={streakInfo !== null}
        onOpenChange={(open) => !open && setStreakInfo(null)}
      />
    </AppShell>
  );
}
