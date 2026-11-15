import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { useEffect } from "react";

/** Aviso curto quando a pessoa toca num nó bloqueado — em vez de o toque ficar mudo. */
export function LockedHint({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="glass-dark animate-in fade-in slide-in-from-bottom-2 fixed bottom-28 left-1/2 z-40 flex max-w-[calc(100vw-2.5rem)] -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm font-medium duration-200 motion-reduce:animate-none"
    >
      <Lock className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

/** Atalho flutuante: aparece quando a atividade atual está fora da tela e leva até ela. */
export function BackToCurrent({
  visible,
  direction,
  onClick,
}: {
  visible: boolean;
  direction: "up" | "down";
  onClick: () => void;
}) {
  if (!visible) return null;
  const Arrow = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-dark press animate-in fade-in slide-in-from-bottom-2 fixed bottom-28 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-medium duration-200 motion-reduce:animate-none"
    >
      <Arrow className="h-4 w-4" /> Voltar à atividade atual
    </button>
  );
}
