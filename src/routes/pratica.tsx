import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, Mic, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/pratica")({
  head: () => ({
    meta: [
      { title: "Praticar conversa — Hi" },
      { name: "description", content: "Converse por texto ou voz e receba correções priorizadas." },
      { property: "og:title", content: "Praticar conversa — Hi" },
      { property: "og:description", content: "Converse por texto ou voz e receba correções priorizadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pratica,
});

type Msg = { from: "hi" | "me"; text: string; fix?: string };

function Pratica() {
  const [mode, setMode] = useState<"chat" | "voz">("chat");
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "hi", text: "Hey! How was your weekend? Did you do anything fun?" },
  ]);

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [
      ...m,
      { from: "me", text, fix: "Mais natural: “I went to the beach with my friends.”" },
      { from: "hi", text: "That sounds lovely! What was the best part of the day?" },
    ]);
    setText("");
  };

  return (
    <AppShell hideTabs>
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Fechar" className="glass press grid h-11 w-11 place-items-center rounded-full"><X className="h-5 w-5" /></Link>
        <div className="glass flex rounded-full p-1">
          {(["chat", "voz"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`press h-9 rounded-full px-5 text-sm font-medium capitalize ${mode === m ? "glass-dark" : "text-muted-foreground"}`}>{m}</button>
          ))}
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">Missão · Fim de semana</p>
        <h1 className="mt-1 font-display text-2xl">Conte sua história</h1>
      </div>

      <div className="mt-8 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "me" ? "flex flex-col items-end" : ""}>
            <div className={`surface max-w-[80%] rounded-3xl px-5 py-3 text-[15px] ${m.from === "me" ? "rounded-br-lg bg-secondary" : "rounded-bl-lg"}`}>{m.text}</div>
            {m.fix && (
              <p className="mt-2 flex max-w-[80%] items-start gap-1.5 text-xs text-muted-foreground"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />{m.fix}</p>
            )}
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-6 mx-auto flex max-w-md gap-2 px-5">
        <div className="glass flex h-14 flex-1 items-center rounded-full pl-5 pr-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Responda em inglês…" className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground" />
          {text && <button onClick={send} aria-label="Enviar" className="glass-dark press grid h-10 w-10 place-items-center rounded-full"><Send className="h-4 w-4" /></button>}
        </div>
        <button aria-label="Falar" className="glass-tint press grid h-14 w-14 place-items-center rounded-full"><Mic className="h-5 w-5" /></button>
      </div>
    </AppShell>
  );
}
