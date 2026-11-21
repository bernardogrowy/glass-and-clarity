import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getLastAddedId, useInbox, type InboxItem } from "@/lib/notifications-store";

const SHOW_MS = 7000;

/**
 * Banner no topo da tela quando chega um aviso do mentor com o app aberto (como a notificação
 * do celular). Toque para abrir a central de notificações. Some sozinho.
 */
export function NotificationBanner() {
  const inbox = useInbox();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [shown, setShown] = useState<InboxItem | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const lastId = getLastAddedId();
    if (!lastId || lastId === seen.current) return;
    seen.current = lastId;
    const item = inbox.items.find((i) => i.id === lastId);
    if (!item || document.visibilityState !== "visible") return;
    setShown(item);
    const timer = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [inbox.items]);

  if (!shown || pathname === "/notificacoes") return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[70] mx-auto max-w-md">
      <button
        type="button"
        role="status"
        aria-live="polite"
        onClick={() => {
          setShown(null);
          void navigate({ to: "/notificacoes" });
        }}
        className="surface pointer-events-auto flex w-full items-start gap-3 rounded-3xl p-3.5 text-left shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 motion-reduce:animate-none"
      >
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 font-display text-lg"
        >
          Hi
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70">Hi · Mentor</span>
            <span>agora</span>
          </span>
          <span className="mt-0.5 block text-[15px] font-semibold leading-snug">{shown.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-muted-foreground">
            {shown.body}
          </span>
        </span>
      </button>
    </div>
  );
}
