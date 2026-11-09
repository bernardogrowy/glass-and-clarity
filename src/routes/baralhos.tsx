import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Settings2, Layers, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SrsSettingsSheet } from "@/components/SrsSettingsSheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createDeck, getDeckCards, getDueCards, useFlashcardsStore } from "@/lib/flashcards-store";

export const Route = createFileRoute("/baralhos")({
  head: () => ({
    meta: [
      { title: "Baralhos — Hi" },
      {
        name: "description",
        content: "Organize suas palavras em baralhos e revise com repetição espaçada.",
      },
      { property: "og:title", content: "Baralhos — Hi" },
      {
        property: "og:description",
        content: "Organize suas palavras em baralhos e revise com repetição espaçada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Baralhos,
});

function Baralhos() {
  const state = useFlashcardsStore();
  const navigate = useNavigate();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState("");

  const totalCards = state.cards.length;
  const totalDue = state.decks.reduce((sum, d) => sum + getDueCards(state, d.id).length, 0);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const deck = createDeck(trimmed);
    setName("");
    setNewDeckOpen(false);
    toast.success("Baralho criado");
    navigate({ to: "/flashcards/$deckId", params: { deckId: deck.id } });
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl leading-tight">
          Meus
          <br />
          baralhos
        </h1>
        <button
          aria-label="Configurar revisão"
          onClick={() => setSettingsOpen(true)}
          className="glass press grid h-11 w-11 shrink-0 place-items-center rounded-full"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={() => setNewDeckOpen(true)}
        className="glass press mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Novo baralho
      </button>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="surface rounded-3xl p-4">
          <div className="bg-peach grid h-11 w-11 place-items-center rounded-2xl">
            <CalendarCheck className="h-5 w-5 text-foreground/70" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Pra revisar hoje</p>
          <p className="font-display text-2xl">{totalDue}</p>
        </div>
        <div className="surface rounded-3xl p-4">
          <div className="bg-sky grid h-11 w-11 place-items-center rounded-2xl">
            <Layers className="h-5 w-5 text-foreground/70" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Cards no total</p>
          <p className="font-display text-2xl">{totalCards}</p>
        </div>
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl">Baralhos ({state.decks.length})</h2>
      {state.decks.length === 0 ? (
        <div className="surface rounded-3xl p-6 text-center text-sm text-muted-foreground">
          <Layers className="mx-auto mb-3 h-6 w-6" />
          Você ainda não tem baralhos. Crie um pra começar a juntar palavras.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {state.decks.map((deck) => {
            const cards = getDeckCards(state, deck.id);
            const due = getDueCards(state, deck.id).length;
            return (
              <Link
                key={deck.id}
                to="/flashcards/$deckId"
                params={{ deckId: deck.id }}
                className="surface press relative rounded-3xl p-4"
              >
                {due > 0 && (
                  <span className="glass-dark absolute right-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {due}
                  </span>
                )}
                <div className={`${deck.tone} grid h-11 w-11 place-items-center rounded-2xl`}>
                  <Layers className="h-5 w-5 text-foreground/70" />
                </div>
                <p className="mt-4 font-display text-lg leading-tight pr-6">{deck.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cards.length} card{cards.length === 1 ? "" : "s"}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={newDeckOpen} onOpenChange={setNewDeckOpen}>
        <DialogContent className="surface rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Novo baralho</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Ex: Palavras do livro"
            className="h-12 w-full rounded-2xl bg-muted px-4 outline-none"
          />
          <DialogFooter>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="glass-dark press flex h-12 w-full items-center justify-center rounded-2xl font-medium disabled:opacity-50"
            >
              Criar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SrsSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={state.settings}
      />
    </AppShell>
  );
}
