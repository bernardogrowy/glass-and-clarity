import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  X,
  Mic,
  Send,
  Sparkles,
  Check,
  Timer,
  History,
  ChevronLeft,
  MessageCircle,
  BarChart3,
  Layers,
  Lightbulb,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StreakCelebration } from "@/components/StreakCelebration";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addCard, createDeck, useFlashcardsStore } from "@/lib/flashcards-store";
import { completeSession } from "@/lib/progress-store";
import { useProfileStore } from "@/lib/profile-store";
import {
  markOnboarded,
  saveConversation,
  useChatStore,
  type ChatMessage,
  type Conversation,
} from "@/lib/chat-store";
import { registerActivity } from "@/lib/streak-store";

const MISSION_TITLE = "Fim de semana";
const OPENING_MESSAGE: ChatMessage = {
  from: "hi",
  text: "Hey! How was your weekend? Did you do anything fun?",
};
const CORRECTION = 'Mais natural: "I went to the beach with my friends."';
const FOLLOW_UP = "That sounds lovely! What was the best part of the day?";
const MISSION_NEW_WORDS = ["hang out", "the best part"];
const VOICE_LINE = "I went to the beach with my friends";
const VOICE_MISPRONOUNCED: Record<string, string> = {
  beach: "/biːtʃ/ — vogal mais longa, pra não soar como outra palavra parecida",
};
type CaptionWord = { text: string; status: "ok" | "err" | "plain" };
type Caption = { speaker: "me" | "hi"; words: CaptionWord[] };
const PRONUNCIATION_TIPS = [
  'Palavras terminadas em "-ed" geralmente somam só uma sílaba a mais depois de "t" ou "d" (ex: wanted, needed).',
  'O som de "th" não existe em português — tente colocar a língua entre os dentes pra praticar.',
  "Frases em inglês têm ritmo: as palavras importantes ficam mais fortes, as pequenas (a, the, of) quase somem.",
];

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function randomTip(): string {
  const idx = Math.floor(Math.random() * PRONUNCIATION_TIPS.length);
  return (
    PRONUNCIATION_TIPS[idx] ?? "Pratique em voz alta todos os dias, mesmo que só por 5 minutos."
  );
}

export const Route = createFileRoute("/pratica")({
  head: () => ({
    meta: [
      { title: "Praticar conversa — Hi" },
      { name: "description", content: "Converse por texto ou voz e receba correções priorizadas." },
      { property: "og:title", content: "Praticar conversa — Hi" },
      {
        property: "og:description",
        content: "Converse por texto ou voz e receba correções priorizadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pratica,
});

function Pratica() {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const chatState = useChatStore();
  const flashcards = useFlashcardsStore();

  const [phase, setPhase] = useState<"landing" | "chat" | "feedback">("landing");
  const [mode, setMode] = useState<"chat" | "voz">("chat");
  const [text, setText] = useState("");
  const [secs, setSecs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [msgs, setMsgs] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [addedWords, setAddedWords] = useState<string[]>([]);
  const [streakInfo, setStreakInfo] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<Conversation | null>(null);
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening" | "speaking">("idle");
  const [caption, setCaption] = useState<Caption | null>(null);
  const [pronunciationIssues, setPronunciationIssues] = useState<
    { word: string; correct: string }[]
  >([]);
  const voiceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (phase !== "chat") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const clearVoiceTimers = () => {
    voiceTimers.current.forEach(clearTimeout);
    voiceTimers.current = [];
  };

  useEffect(() => clearVoiceTimers, []);

  const resetVoice = () => {
    clearVoiceTimers();
    setVoicePhase("idle");
    setCaption(null);
  };

  const startMission = () => {
    markOnboarded();
    setMsgs([OPENING_MESSAGE]);
    setAddedWords([]);
    setPronunciationIssues([]);
    resetVoice();
    setSecs(0);
    setStartedAt(Date.now());
    setPhase("chat");
  };

  const selectMode = (m: "chat" | "voz") => {
    if (m !== mode) resetVoice();
    setMode(m);
  };

  const startVoiceTurn = () => {
    if (voicePhase !== "idle") return;
    setVoicePhase("listening");
    const words = VOICE_LINE.split(" ");
    setCaption({ speaker: "me", words: [] });
    words.forEach((word, i) => {
      const timer = setTimeout(() => {
        const bare = word.toLowerCase().replace(/[.,!?]/g, "");
        const status: CaptionWord["status"] = VOICE_MISPRONOUNCED[bare] ? "err" : "ok";
        setCaption((c) => ({
          speaker: "me",
          words: [...(c?.words ?? []), { text: word, status }],
        }));
        if (i === words.length - 1) {
          const finishTimer = setTimeout(finishVoiceTurn, 600);
          voiceTimers.current.push(finishTimer);
        }
      }, i * 350);
      voiceTimers.current.push(timer);
    });
  };

  const finishVoiceTurn = () => {
    const issues = Object.entries(VOICE_MISPRONOUNCED).map(([word, correct]) => ({
      word,
      correct,
    }));
    setPronunciationIssues((prev) => {
      const existing = new Set(prev.map((p) => p.word));
      return [...prev, ...issues.filter((i) => !existing.has(i.word))];
    });
    const spoken: ChatMessage =
      issues.length > 0
        ? {
            from: "me",
            text: VOICE_LINE,
            fix: `Pronúncia: preste atenção em "${issues.map((i) => i.word).join(", ")}".`,
          }
        : { from: "me", text: VOICE_LINE };
    setMsgs((m) => [...m, spoken, { from: "hi", text: FOLLOW_UP }]);
    setVoicePhase("speaking");
    setCaption({
      speaker: "hi",
      words: FOLLOW_UP.split(" ").map((text) => ({ text, status: "plain" })),
    });
    const idleTimer = setTimeout(() => {
      setVoicePhase("idle");
      setCaption(null);
    }, 2200);
    voiceTimers.current.push(idleTimer);
  };

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { from: "me", text, fix: CORRECTION }, { from: "hi", text: FOLLOW_UP }]);
    setText("");
  };

  const corrections = msgs.filter((m) => m.fix).map((m) => m.fix as string);
  const userMessageCount = msgs.filter((m) => m.from === "me").length;
  const score =
    userMessageCount === 0
      ? 100
      : Math.max(0, Math.round(100 * (1 - corrections.length / userMessageCount)));

  const addWordToDeck = (word: string) => {
    let deck = flashcards.decks.find((d) => d.name === "Palavras do chat");
    if (!deck) deck = createDeck("Palavras do chat");
    addCard(deck.id, { front: word, back: "" });
    setAddedWords((w) => [...w, word]);
    toast.success("Adicionado aos baralhos");
  };

  const conclude = () => {
    saveConversation({
      missionTitle: MISSION_TITLE,
      startedAt,
      messages: msgs,
      score,
      newWords: MISSION_NEW_WORDS,
    });
    completeSession({ missionTitle: MISSION_TITLE, minutes: Math.max(1, Math.round(secs / 60)) });
    toast.success("Missão concluída!");
    const result = registerActivity();
    if (result.isFirstToday) setStreakInfo(result.streak);
    else navigate({ to: "/" });
  };

  const openHistoryItem = (c: Conversation) => {
    setHistoryOpen(false);
    setHistoryDetail(c);
  };

  const suggestions = [
    {
      icon: MessageCircle,
      title: "Começar a missão do dia",
      tone: "bg-butter",
      action: startMission,
    },
    {
      icon: BarChart3,
      title: "Ver meu progresso",
      tone: "bg-sky",
      action: () => navigate({ to: "/progresso" }),
    },
    {
      icon: Layers,
      title: "Revisar vocabulário",
      tone: "bg-mint",
      action: () => navigate({ to: "/baralhos" }),
    },
    {
      icon: Lightbulb,
      title: "Dica de pronúncia",
      tone: "bg-lilac",
      action: () => toast.message(randomTip()),
    },
  ];

  const modeToggle = (
    <div className="glass flex rounded-full p-1">
      {(["chat", "voz"] as const).map((m) => (
        <button
          key={m}
          onClick={() => selectMode(m)}
          className={`press h-9 rounded-full px-5 text-sm font-medium capitalize ${mode === m ? "glass-dark" : "text-muted-foreground"}`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  let body: ReactNode;

  if (phase === "landing") {
    body = (
      <>
        <header className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Fechar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <X className="h-5 w-5" />
          </Link>
          {modeToggle}
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label="Histórico de conversas"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <History className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Olá, {profile.name}</p>
          <h1 className="mt-1 font-display text-3xl">Como posso ajudar?</h1>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {suggestions.map(({ icon: Icon, title, tone, action }) => (
            <button
              key={title}
              onClick={action}
              className="surface press rounded-3xl p-4 text-left"
            >
              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 font-display text-base leading-snug">{title}</p>
            </button>
          ))}
        </div>

        {!chatState.hasOnboarded && (
          <p className="surface mt-6 rounded-2xl p-4 text-center text-xs text-muted-foreground">
            Toque em "Começar a missão do dia" pra ter sua primeira conversa.
          </p>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Sou o Hi, seu parceiro de conversação. Hoje ainda uso diálogos de exemplo — em breve,
          prática com IA de verdade.
        </p>
      </>
    );
  } else if (phase === "chat") {
    body = (
      <>
        <header className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Fechar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <X className="h-5 w-5" />
          </Link>
          {modeToggle}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label="Histórico de conversas"
              className="glass press grid h-11 w-11 place-items-center rounded-full"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={() => setPhase("feedback")}
              aria-label="Concluir missão"
              className="glass-tint press grid h-11 w-11 place-items-center rounded-full"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <span>Missão · {MISSION_TITLE}</span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {fmt(secs)}
            </span>
          </p>
          <h1 className="mt-1 font-display text-2xl">Conte sua história</h1>
        </div>

        {mode === "chat" ? (
          <>
            <div className="mt-8 space-y-4">
              {msgs.map((m, i) => (
                <div key={i} className={m.from === "me" ? "flex flex-col items-end" : ""}>
                  <div
                    className={`surface max-w-[80%] rounded-3xl px-5 py-3 text-[15px] ${m.from === "me" ? "rounded-br-lg bg-secondary" : "rounded-bl-lg"}`}
                  >
                    {m.text}
                  </div>
                  {m.fix && (
                    <p className="mt-2 flex max-w-[80%] items-start gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      {m.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="fixed inset-x-0 bottom-6 mx-auto flex max-w-md gap-2 px-5">
              <div className="glass flex h-14 flex-1 items-center rounded-full pl-5 pr-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Responda em inglês…"
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
                {text && (
                  <button
                    onClick={send}
                    aria-label="Enviar"
                    className="glass-dark press grid h-10 w-10 place-items-center rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => selectMode("voz")}
                aria-label="Falar"
                className="glass-tint press grid h-14 w-14 place-items-center rounded-full"
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-14 flex flex-col items-center text-center">
              <div
                className={`relative grid h-40 w-40 place-items-center rounded-full glass-dark transition-transform duration-300 ${
                  voicePhase === "listening" ? "scale-105" : ""
                }`}
              >
                <div
                  className={`absolute inset-3 rounded-full bg-accent/30 ${
                    voicePhase !== "idle" ? "animate-pulse" : ""
                  }`}
                />
                {voicePhase === "speaking" ? (
                  <Sparkles className="relative h-9 w-9" />
                ) : (
                  <Mic className="relative h-9 w-9" />
                )}
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                {voicePhase === "listening"
                  ? "Ouvindo você…"
                  : voicePhase === "speaking"
                    ? "Hi está respondendo…"
                    : "Toque no microfone e responda em inglês"}
              </p>
              <p className="mt-8 min-h-[3.5rem] max-w-xs text-lg leading-relaxed">
                {!caption ? (
                  <span className="text-sm text-muted-foreground">
                    Suas palavras aparecem aqui — verde quando a pronúncia tá boa, vermelho quando
                    precisa de atenção.
                  </span>
                ) : (
                  caption.words.map((w, i) => (
                    <span
                      key={i}
                      className={
                        w.status === "err"
                          ? "text-destructive"
                          : w.status === "ok"
                            ? "text-accent"
                            : "text-foreground"
                      }
                    >
                      {w.text}{" "}
                    </span>
                  ))
                )}
              </p>
            </div>

            <div className="fixed inset-x-0 bottom-10 flex justify-center">
              <button
                onClick={startVoiceTurn}
                disabled={voicePhase !== "idle"}
                aria-label="Falar"
                className="glass-dark press grid h-16 w-16 place-items-center rounded-full disabled:opacity-50"
              >
                <Mic className="h-6 w-6" />
              </button>
            </div>
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPhase("chat")}
            aria-label="Voltar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="font-medium">Resumo</p>
          <div className="h-11 w-11" />
        </div>

        <div className="mt-8 text-center">
          <div
            className="mx-auto grid h-36 w-36 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--accent) ${score * 3.6}deg, var(--muted) 0)`,
            }}
          >
            <div className="grid h-28 w-28 place-items-center rounded-full bg-card">
              <p className="font-display text-3xl">{score}%</p>
            </div>
          </div>
          <h1 className="mt-4 font-display text-2xl">
            {score >= 70 ? "Mandou bem!" : "Continue praticando"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(secs)} de conversa · {userMessageCount} mensagem{userMessageCount === 1 ? "" : "s"}
          </p>
        </div>

        {corrections.length > 0 && (
          <div className="surface mt-8 rounded-3xl p-5">
            <p className="font-medium">Pontos de atenção</p>
            <ul className="mt-3 space-y-2">
              {corrections.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pronunciationIssues.length > 0 && (
          <div className="surface mt-6 rounded-3xl p-5">
            <p className="font-medium">Pronúncia</p>
            <ul className="mt-3 space-y-2">
              {pronunciationIssues.map((p) => (
                <li key={p.word} className="rounded-2xl bg-muted px-4 py-3">
                  <p className="text-sm font-medium text-destructive">{p.word}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.correct}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="surface mt-6 rounded-3xl p-5">
          <p className="font-medium">Palavras novas</p>
          <ul className="mt-3 space-y-2">
            {MISSION_NEW_WORDS.map((word) => (
              <li
                key={word}
                className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3"
              >
                <span className="text-sm">{word}</span>
                {addedWords.includes(word) ? (
                  <Check className="h-4 w-4 text-accent" />
                ) : (
                  <button
                    onClick={() => addWordToDeck(word)}
                    aria-label={`Adicionar ${word} aos baralhos`}
                    className="glass press grid h-8 w-8 place-items-center rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={conclude}
          className="glass-dark press mt-8 flex h-14 w-full items-center justify-center rounded-full font-medium"
        >
          Concluir
        </button>
      </>
    );
  }

  return (
    <AppShell hideTabs>
      {body}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[80vh] flex-col overflow-y-auto rounded-t-3xl border-none bg-background"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Histórico</SheetTitle>
          </SheetHeader>
          {chatState.conversations.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Nenhuma conversa concluída ainda.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {chatState.conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openHistoryItem(c)}
                    className="surface flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.missionTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.endedAt).toLocaleDateString("pt-BR")} · {c.messages.length}{" "}
                        mensagens
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {c.score}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!historyDetail} onOpenChange={(open) => !open && setHistoryDetail(null)}>
        <DialogContent className="surface max-h-[80vh] overflow-y-auto rounded-3xl border-none">
          {historyDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {historyDetail.missionTitle}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                {new Date(historyDetail.endedAt).toLocaleDateString("pt-BR")} ·{" "}
                {historyDetail.score}%
              </p>
              <div className="mt-4 space-y-3">
                {historyDetail.messages.map((m, i) => (
                  <div key={i} className={m.from === "me" ? "flex flex-col items-end" : ""}>
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm ${m.from === "me" ? "rounded-br-lg bg-secondary" : "rounded-bl-lg bg-muted"}`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <StreakCelebration
        streak={streakInfo ?? 0}
        open={streakInfo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStreakInfo(null);
            navigate({ to: "/" });
          }
        }}
      />
    </AppShell>
  );
}
