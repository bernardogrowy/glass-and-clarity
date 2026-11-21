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
  Square,
  Keyboard,
  Captions,
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
  aiErrorMessage,
  createTutorSession,
  MAX_USER_MESSAGE_CHARS,
  type TutorSession,
} from "@/lib/ai";
import { ASSUNTO_LABELS, CORRECAO_LABELS, useOnboardingStore } from "@/lib/onboarding-store";
import { DEFAULT_MISSION, pickMission, type Mission } from "@/lib/mission-topics";
import { canSpeak, speak, stopSpeaking } from "@/lib/speech";
import { canLiveCaption, startLiveCaptions } from "@/lib/live-captions";
import { VoiceOrb, type OrbState } from "@/components/VoiceOrb";
import {
  MAX_RECORDING_MS,
  recordingErrorMessage,
  startRecording,
  toWav16k,
  type Recording,
} from "@/lib/voice-recorder";
import {
  markOnboarded,
  saveConversation,
  useChatStore,
  type ChatMessage,
  type Conversation,
} from "@/lib/chat-store";
import { registerActivity } from "@/lib/streak-store";

const openingOf = (m: Mission): ChatMessage => ({ from: "hi", text: m.opening });
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
  const onboarding = useOnboardingStore();

  const tutorRef = useRef<TutorSession | null>(null);
  const [thinking, setThinking] = useState(false);
  const [missionWords, setMissionWords] = useState<string[]>([]);
  const [phase, setPhase] = useState<"landing" | "chat" | "feedback">("landing");
  const [mode, setMode] = useState<"chat" | "voz">("chat");
  const [text, setText] = useState("");
  const [secs, setSecs] = useState(0);
  // O cronômetro só começa quando a pessoa pratica de fato (1ª mensagem ou 1ª fala), não ao abrir a missão.
  const [practicing, setPracticing] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [mission, setMission] = useState<Mission>(DEFAULT_MISSION);
  const [msgs, setMsgs] = useState<ChatMessage[]>([openingOf(DEFAULT_MISSION)]);
  const [addedWords, setAddedWords] = useState<string[]>([]);
  const [streakInfo, setStreakInfo] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<Conversation | null>(null);
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening" | "processing" | "speaking">(
    "idle",
  );
  // Legenda ao vivo do que a pessoa está falando (só retorno visual; a transcrição final vem do Gemini).
  const [liveText, setLiveText] = useState("");
  const [captionsOn, setCaptionsOn] = useState(true);
  const captionsRef = useRef<{ stop: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Cada fala/resposta tem um "turno"; resultados de turnos antigos são ignorados.
  const voiceTurnRef = useRef(0);

  useEffect(() => {
    if (phase !== "chat" || !practicing) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, practicing]);

  const resetVoice = () => {
    voiceTurnRef.current += 1;
    clearTimeout(autoStopRef.current);
    recordingRef.current?.cancel();
    recordingRef.current = null;
    stopSpeaking();
    captionsRef.current?.stop();
    captionsRef.current = null;
    setVoicePhase("idle");
    setLiveText("");
  };

  // Ao sair da tela: solta o microfone e para a fala.
  useEffect(() => resetVoice, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("hi.voice.captions") === "off") setCaptionsOn(false);
    } catch {
      // sem localStorage: segue com o padrão (ligado)
    }
  }, []);

  // No modo voz a conversa cresce: mantém o fim (legenda/última mensagem) à vista.
  useEffect(() => {
    if (mode === "voz") endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mode, msgs.length, liveText, voicePhase]);

  const startMission = () => {
    markOnboarded();
    const { answers } = onboarding;
    // A missão (e a primeira fala do Hi) sai dos assuntos escolhidos no onboarding.
    const next = pickMission(
      answers.assuntos,
      chatState.conversations.slice(0, 3).map((c) => c.missionTitle),
      Math.random,
      profile.level,
    );
    setMission(next);
    tutorRef.current = createTutorSession({
      userName: profile.name,
      level: profile.level,
      missionTitle: next.title,
      missionGoal: next.goal,
      openingMessage: next.opening,
      correctionStyle: answers.correcaoPref ? CORRECAO_LABELS[answers.correcaoPref] : null,
      topics: answers.assuntos.filter((a) => a !== "outro").map((a) => ASSUNTO_LABELS[a]),
    });
    setThinking(false);
    setMissionWords([]);
    setMsgs([openingOf(next)]);
    setAddedWords([]);
    resetVoice();
    setSecs(0);
    setPracticing(false);
    setStartedAt(Date.now());
    setPhase("chat");
  };

  const selectMode = (m: "chat" | "voz") => {
    if (m !== mode) resetVoice();
    setMode(m);
  };

  const startVoiceTurn = async () => {
    if (voicePhase !== "idle") return;
    if (!tutorRef.current) {
      toast.error("A IA não está disponível agora. Verifique a configuração do Firebase.");
      return;
    }
    try {
      const turnId = ++voiceTurnRef.current;
      const recording = await startRecording();
      if (voiceTurnRef.current !== turnId) {
        recording.cancel(); // a pessoa saiu/trocou de modo enquanto o navegador pedia permissão
        return;
      }
      recordingRef.current = recording;
      setPracticing(true);
      setLiveText("");
      setVoicePhase("listening");
      if (captionsOn) captionsRef.current = startLiveCaptions(setLiveText);
      autoStopRef.current = setTimeout(() => void finishVoiceTurn(), MAX_RECORDING_MS);
    } catch (error) {
      toast.error(recordingErrorMessage(error) ?? "Não foi possível usar o microfone.");
    }
  };

  const finishVoiceTurn = async () => {
    const recording = recordingRef.current;
    const tutor = tutorRef.current;
    if (!recording || !tutor) return;
    clearTimeout(autoStopRef.current);
    recordingRef.current = null;
    captionsRef.current?.stop(); // a legenda fica na tela até a resposta chegar
    captionsRef.current = null;
    const turnId = ++voiceTurnRef.current;
    setVoicePhase("processing");

    try {
      const wav = await toWav16k(await recording.stop());
      const turn = await tutor.sendAudio(wav);
      if (voiceTurnRef.current !== turnId) return;

      if (!turn.transcript) {
        // Nada inteligível: o Hi só pediu para repetir; não conta como fala da pessoa.
        toast.message("Não consegui ouvir. Fale um pouco mais perto do microfone e tente de novo.");
        setLiveText("");
        setVoicePhase("idle");
        return;
      }

      setMsgs((m) => [
        ...m,
        turn.correction
          ? { from: "me", text: turn.transcript as string, fix: turn.correction }
          : { from: "me", text: turn.transcript as string },
        { from: "hi", text: turn.reply },
      ]);
      if (turn.newWords.length > 0) {
        setMissionWords((prev) => [
          ...prev,
          ...turn.newWords.filter((w) => !prev.some((p) => p.toLowerCase() === w.toLowerCase())),
        ]);
      }

      setLiveText(""); // a legenda vira a mensagem real da conversa
      setVoicePhase("speaking");
      const backToIdle = () => {
        if (voiceTurnRef.current !== turnId) return;
        setVoicePhase("idle");
      };
      if (canSpeak()) speak(turn.reply, "en-US", 1, backToIdle);
      else setTimeout(backToIdle, 3000);
    } catch (error) {
      if (voiceTurnRef.current !== turnId) return;
      console.error("[tutor] falha no turno de voz", error);
      toast.error(recordingErrorMessage(error) ?? aiErrorMessage(error));
      setLiveText("");
      setVoicePhase("idle");
    }
  };

  const toggleVoice = () => {
    if (voicePhase === "idle") void startVoiceTurn();
    else if (voicePhase === "listening") void finishVoiceTurn();
  };

  const toggleCaptions = () => {
    const next = !captionsOn;
    setCaptionsOn(next);
    try {
      window.localStorage.setItem("hi.voice.captions", next ? "on" : "off");
    } catch {
      // sem localStorage: vale só nesta sessão
    }
    if (!next) {
      captionsRef.current?.stop();
      captionsRef.current = null;
      setLiveText("");
    } else if (voicePhase === "listening") {
      captionsRef.current = startLiveCaptions(setLiveText);
    }
  };

  const getMicLevel = () => recordingRef.current?.level() ?? 0;

  const send = async () => {
    const message = text.trim();
    if (!message || thinking) return;
    const tutor = tutorRef.current;
    if (!tutor) {
      toast.error("A IA não está disponível agora. Verifique a configuração do Firebase.");
      return;
    }

    setPracticing(true);
    setMsgs((m) => [...m, { from: "me", text: message }]);
    setText("");
    setThinking(true);
    try {
      const turn = await tutor.send(message);
      setMsgs((m) => {
        const next = [...m];
        // A correção fica junto da frase da pessoa (a última mensagem dela).
        const lastMine = next.map((x) => x.from).lastIndexOf("me");
        const mine = next[lastMine];
        if (turn.correction && mine) next[lastMine] = { ...mine, fix: turn.correction };
        return [...next, { from: "hi", text: turn.reply }];
      });
      if (turn.newWords.length > 0) {
        setMissionWords((prev) => [
          ...prev,
          ...turn.newWords.filter((w) => !prev.some((p) => p.toLowerCase() === w.toLowerCase())),
        ]);
      }
    } catch (error) {
      console.error("[tutor] falha ao obter resposta", error);
      toast.error(aiErrorMessage(error));
      // Devolve a frase para o campo, para a pessoa tentar de novo sem digitar tudo outra vez.
      setMsgs((m) => m.slice(0, -1));
      setText(message);
    } finally {
      setThinking(false);
    }
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
      missionTitle: mission.title,
      startedAt,
      messages: msgs,
      score,
      newWords: missionWords,
    });
    completeSession({ missionTitle: mission.title, minutes: Math.max(1, Math.round(secs / 60)) });
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

  const orbState: OrbState =
    voicePhase === "listening"
      ? "listen"
      : voicePhase === "processing"
        ? "think"
        : voicePhase === "speaking"
          ? "speak"
          : "idle";
  const voiceStatusText =
    voicePhase === "listening"
      ? "Ouvindo… toque no botão quando terminar"
      : voicePhase === "processing"
        ? "Hi está ouvindo sua resposta…"
        : voicePhase === "speaking"
          ? "Hi está respondendo…"
          : "Toque no microfone e responda em inglês";

  const messageList = msgs.map((m, i) => (
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
  ));

  const typingDots = (
    <span className="inline-flex gap-1.5 py-1" aria-hidden="true">
      <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
    </span>
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
          <p className="text-sm text-muted-foreground">
            Olá{profile.name ? `, ${profile.name}` : ""}
          </p>
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
            <span>Missão · {mission.title}</span>
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
              {messageList}
              {thinking && (
                <div role="status" aria-label="O Hi está escrevendo">
                  <div className="surface inline-flex gap-1.5 rounded-3xl rounded-bl-lg px-5 py-4">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            <div className="fixed inset-x-0 bottom-6 mx-auto flex max-w-md gap-2 px-5">
              <div className="glass flex h-14 flex-1 items-center rounded-full pl-5 pr-2">
                <input
                  value={text}
                  maxLength={MAX_USER_MESSAGE_CHARS}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="Responda em inglês…"
                  className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
                {text && (
                  <button
                    onClick={() => void send()}
                    disabled={thinking}
                    aria-label="Enviar"
                    className="glass-dark press grid h-10 w-10 place-items-center rounded-full disabled:opacity-50"
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
            <div className="sticky top-0 z-10 -mx-5 flex flex-col items-center bg-gradient-to-b from-background via-background/95 to-transparent px-5 pb-4 pt-2">
              <VoiceOrb state={orbState} getLevel={getMicLevel} size={168} />
              <p className="-mt-1 text-sm text-muted-foreground" aria-live="polite">
                {voiceStatusText}
              </p>
            </div>

            <div className="mt-4 space-y-4 pb-44">
              {messageList}
              {(voicePhase === "listening" || (voicePhase === "processing" && liveText)) && (
                <div className="flex flex-col items-end">
                  <div className="max-w-[80%] rounded-3xl rounded-br-lg border border-dashed border-foreground/20 bg-secondary/60 px-5 py-3 text-[15px] text-foreground/70">
                    {liveText || typingDots}
                  </div>
                </div>
              )}
              {voicePhase === "processing" && !liveText && (
                <div role="status" aria-label="O Hi está ouvindo">
                  <div className="surface inline-flex rounded-3xl rounded-bl-lg px-5 py-3">
                    {typingDots}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="fixed inset-x-0 bottom-6 mx-auto flex max-w-md justify-center px-5">
              <div className="glass flex items-center gap-3 rounded-full p-2">
                <button
                  onClick={() => selectMode("chat")}
                  aria-label="Digitar"
                  className="press grid h-12 w-12 place-items-center rounded-full text-muted-foreground"
                >
                  <Keyboard className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleVoice}
                  disabled={voicePhase === "processing" || voicePhase === "speaking"}
                  aria-label={voicePhase === "listening" ? "Enviar resposta" : "Falar"}
                  className="glass-dark press grid h-16 w-16 place-items-center rounded-full disabled:opacity-50"
                >
                  {voicePhase === "listening" ? (
                    <Square className="h-5 w-5 fill-current" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </button>
                {canLiveCaption() ? (
                  <button
                    onClick={toggleCaptions}
                    aria-label="Legendas ao vivo"
                    aria-pressed={captionsOn}
                    className={`press grid h-12 w-12 place-items-center rounded-full ${captionsOn ? "glass-tint" : "text-muted-foreground"}`}
                  >
                    <Captions className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="h-12 w-12" aria-hidden="true" />
                )}
              </div>
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

        <div className="surface mt-6 rounded-3xl p-5">
          <p className="font-medium">Palavras novas</p>
          <ul className="mt-3 space-y-2">
            {missionWords.length === 0 && (
              <li className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Nenhuma palavra nova nesta conversa.
              </li>
            )}
            {missionWords.map((word) => (
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
