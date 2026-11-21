import { Link } from "@tanstack/react-router";
import { Check, CircleAlert, Layers, Volume2, X } from "lucide-react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { useLessonStore } from "@/lib/lesson-store";
import { STAGES, STEP_STAGE, type LessonWord, type StepKind } from "@/lib/lessons";
import { speak } from "@/lib/speech";
import { getActivity, getCourseOfActivity } from "@/lib/trail";
import { cn } from "@/lib/utils";

/** Moldura de qualquer tela da lição: fechar, barra de progresso, contador e etapa atual. */
export function LessonFrame({
  index,
  total,
  kind,
  children,
  footer,
}: {
  index: number;
  total: number;
  kind: StepKind;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const stage = STEP_STAGE[kind];
  const pct = Math.round(((index + 1) / total) * 100);
  // Lição da trilha: sair volta pra trilha; de um curso extra, volta pros cursos; o atalho
  // "Palavras de hoje" avulso volta pro início.
  const lessonId = useLessonStore().session?.lessonId;
  const activity = lessonId ? getActivity(lessonId) : undefined;
  const exitTo = !activity ? "/" : getCourseOfActivity(activity) ? "/cursos" : "/trilha";
  return (
    <AppShell hideTabs>
      <header className="flex items-center gap-3">
        <Link
          to={exitTo}
          aria-label="Sair da lição"
          className="glass press grid h-11 w-11 shrink-0 place-items-center rounded-full"
        >
          <X className="h-5 w-5" />
        </Link>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-9 text-right text-sm font-medium text-muted-foreground">
          {index + 1}/{total}
        </span>
      </header>

      <nav aria-label="Etapas da palavra" className="mt-6 flex justify-between gap-1">
        {STAGES.map((s) => (
          <span
            key={s.id}
            aria-current={s.id === stage ? "step" : undefined}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-medium",
              s.id === stage ? `${s.tone} text-foreground` : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
        ))}
      </nav>

      <div className="mt-8 pb-40">{children}</div>

      {footer && (
        <div className="fixed inset-x-0 bottom-6 z-30 mx-auto flex max-w-md flex-col gap-3 px-5">
          {footer}
        </div>
      )}
    </AppShell>
  );
}

export function LessonCta({
  children,
  onClick,
  disabled,
  variant = "dark",
  autoFocus,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "dark" | "light";
  autoFocus?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn(
        "press flex h-14 w-full items-center justify-center gap-2 rounded-full font-medium",
        variant === "dark" ? "glass-dark" : "glass",
        disabled && "glass pointer-events-none text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function SpeakButton({
  text,
  label = "Ouvir",
  rate = 1,
  lang = "en-US",
  dark,
  className,
}: {
  text: string;
  label?: string;
  rate?: number;
  lang?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang, rate);
      }}
      className={cn(
        "press grid h-12 w-12 shrink-0 place-items-center rounded-full",
        dark ? "glass-dark" : "glass",
        className,
      )}
    >
      <Volume2 className="h-5 w-5" />
    </button>
  );
}

/** Frase de exemplo com a palavra-alvo em negrito. */
export function Highlight({ text, word }: { text: string; word: string }) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "i"));
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part.toLowerCase() === word.toLowerCase() ? <strong>{part}</strong> : part}
        </Fragment>
      ))}
    </>
  );
}

/** Folha que sobe depois de verificar: mint "Muito bom!" ou pêssego "Quase lá!". */
export function FeedbackSheet({
  kind,
  title,
  children,
  actionLabel,
  onAction,
  onSave,
  saved,
}: {
  kind: "ok" | "almost";
  title: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  onSave?: () => void;
  saved?: boolean;
}) {
  const ok = kind === "ok";
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => actionRef.current?.focus(), []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-labelledby="feedback-title"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[2rem] p-6 pb-8 shadow-2xl",
          "animate-in slide-in-from-bottom duration-300",
          ok
            ? "bg-[color-mix(in_oklch,var(--mint)_28%,var(--card))]"
            : "bg-[color-mix(in_oklch,var(--peach)_28%,var(--card))]",
        )}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "grid h-14 w-14 shrink-0 place-items-center rounded-full",
              ok ? "bg-mint" : "bg-peach",
            )}
          >
            {ok ? <Check className="h-6 w-6" /> : <CircleAlert className="h-6 w-6" />}
          </span>
          <h2 id="feedback-title" className="font-display text-3xl">
            {title}
          </h2>
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex gap-3">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saved}
              aria-label={saved ? "Já está no baralho" : "Salvar no baralho"}
              className="glass press grid h-14 w-14 shrink-0 place-items-center rounded-full disabled:opacity-60"
            >
              {saved ? <Check className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
            </button>
          )}
          <button
            ref={actionRef}
            onClick={onAction}
            className="glass-dark press flex h-14 flex-1 items-center justify-center rounded-full font-medium"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </>
  );
}

/** Balão branco com a frase de exemplo, tradução e botão de áudio. */
export function ExampleCard({ word, tone }: { word: LessonWord; tone?: string }) {
  return (
    <div
      className={cn("flex items-center justify-between gap-3 rounded-3xl p-4", tone ?? "surface")}
    >
      <div>
        <p className="text-[15px] leading-snug">
          <Highlight text={word.example} word={word.en} />
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{word.examplePt}</p>
      </div>
      <SpeakButton text={word.example} label="Ouvir a frase" className="h-11 w-11" />
    </div>
  );
}
