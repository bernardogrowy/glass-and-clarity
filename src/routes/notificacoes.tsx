import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CalendarClock, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MissedBlockSheet, type MissedTarget } from "@/components/MissedBlockSheet";
import { StartFocusButton } from "@/components/MentorCard";
import {
  markAllRead,
  markRead,
  unreadCount,
  useInbox,
  type InboxItem,
} from "@/lib/notifications-store";
import { dayKey, parseTime, useStudyPlan } from "@/lib/study-plan-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Hi" },
      {
        name: "description",
        content: "Os avisos do seu mentor: lembretes do plano e perguntas sobre blocos perdidos.",
      },
      { property: "og:title", content: "Notificações — Hi" },
      {
        property: "og:description",
        content: "Os avisos do seu mentor sobre o seu plano de estudo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notificacoes,
});

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "18h" / "18h30" — como o horário de um bloco aparece no cartão da pergunta. */
const blockClock = (time: string) => {
  const { h, m } = parseTime(time);
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
};

function dayLabel(ms: number, now: Date) {
  const key = dayKey(new Date(ms));
  if (key === dayKey(now)) return "Hoje";
  if (key === dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)))
    return "Ontem";
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function Notificacoes() {
  const inbox = useInbox();
  const plan = useStudyPlan();
  const [now, setNow] = useState<Date | null>(null);
  const [target, setTarget] = useState<MissedTarget | null>(null);

  useEffect(() => setNow(new Date()), []);
  if (!now) return <AppShell hideTabs>{null}</AppShell>;

  const items = [...inbox.items].sort((a, b) => b.at - a.at);
  const unread = unreadCount(items);
  const groups: { label: string; items: InboxItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(item.at, now);
    const last = groups.at(-1);
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const answered = (item: InboxItem) =>
    plan.checkins.some((c) => c.date === item.date && c.slotId === item.slotId);

  return (
    <AppShell hideTabs>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Voltar"
          className="glass press grid h-11 w-11 place-items-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          className="press text-sm font-medium disabled:opacity-40"
        >
          Marcar como lidas
        </button>
      </header>

      <h1 className="mt-6 font-display text-4xl leading-[1.05]">Notificações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {unread > 0
          ? `${unread} nova${unread === 1 ? "" : "s"} do seu mentor`
          : "Tudo em dia com o seu mentor"}
      </p>

      {items.length === 0 && (
        <div className="surface mt-8 rounded-3xl p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-butter">
            <Bell className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-xl">Nenhum aviso por enquanto</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.signed
              ? "Quando um bloco do seu plano estiver chegando, eu aviso por aqui."
              : "Assine seu contrato de estudo e eu aviso por aqui."}
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="mt-7">
          <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
          <div className="mt-3 space-y-3">
            {group.items.map((item) => {
              const isQuestion = item.kind === "pergunta";
              const isNow = !isQuestion && now.getTime() - item.at < 10 * 60_000;
              return (
                <article key={item.id} className="surface rounded-3xl p-4">
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                        isQuestion ? "bg-peach" : "bg-butter",
                      )}
                    >
                      {isQuestion ? (
                        <CalendarClock className="h-5 w-5" />
                      ) : (
                        <Bell className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground/70">
                          Mentor{isQuestion ? " · bloco perdido" : isNow ? " · agora" : ""}
                        </span>
                        <span className="flex items-center gap-2">
                          {isQuestion ? blockClock(item.time) : clock(item.at)}
                          {!item.read && (
                            <span
                              role="img"
                              aria-label="Não lida"
                              className="h-2 w-2 rounded-full bg-accent"
                            />
                          )}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-lg leading-snug">{item.title}</h3>
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.body}</p>
                      <div className="mt-3">
                        {isQuestion ? (
                          answered(item) ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              Respondido
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="glass press h-9 rounded-full px-5 text-sm font-medium"
                              onClick={() => {
                                markRead(item.id);
                                setTarget({ date: item.date, slotId: item.slotId });
                              }}
                            >
                              Responder
                            </button>
                          )
                        ) : (
                          <StartFocusButton
                            focus={item.focus}
                            onClick={() => markRead(item.id)}
                            className="glass press inline-flex h-9 items-center gap-2 rounded-full px-5 text-sm font-medium"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <Link
        to="/plano"
        className="glass-dark press fixed bottom-8 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center rounded-full px-6 text-[15px] font-medium shadow-xl"
      >
        Ajustar meu plano de notificações
      </Link>

      <MissedBlockSheet target={target} onClose={() => setTarget(null)} />
    </AppShell>
  );
}
