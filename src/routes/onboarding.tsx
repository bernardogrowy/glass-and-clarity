import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronLeft, Lock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  ASSUNTO_LABELS,
  ASSUNTO_LIST,
  CORRECAO_LABELS,
  CORRECAO_LIST,
  DIFICULDADE_INFO,
  DIFICULDADE_LIST,
  MOTIVO_LABELS,
  MOTIVO_LIST,
  NIVEL_INFO,
  NIVEL_LIST,
  OBJETIVO_LABELS,
  OBJETIVO_LIST,
  PRAZO_PRESETS,
  TEMPO_DIARIO_OPTIONS,
  completeOnboarding,
  emptyAnswers,
  skipOnboarding,
  type OnboardingAnswers,
} from "@/lib/onboarding-store";
import { createGoal } from "@/lib/progress-store";
import { updateProfile, useProfileStore } from "@/lib/profile-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Vamos personalizar seu Hi" },
      {
        name: "description",
        content: "Algumas perguntas rápidas para criar sua primeira meta e missão.",
      },
      { property: "og:title", content: "Vamos personalizar seu Hi" },
      {
        property: "og:description",
        content: "Algumas perguntas rápidas para criar sua primeira meta e missão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const DAY_MS = 24 * 60 * 60 * 1000;
const TOTAL_STEPS = 10;

const STEP_HEADLINES: { eyebrow: string; title: string; subtitle?: string }[] = [
  { eyebrow: "Pergunta 1 de 10", title: "Qual idioma você quer aprender?" },
  { eyebrow: "Pergunta 2 de 10", title: "Como você se sente falando hoje?" },
  {
    eyebrow: "Pergunta 3 de 10",
    title: "Por que você quer aprender?",
    subtitle: "Pode escolher mais de uma opção.",
  },
  { eyebrow: "Pergunta 4 de 10", title: "O que você quer conseguir fazer primeiro?" },
  {
    eyebrow: "Pergunta 5 de 10",
    title: "O que mais atrapalha sua evolução?",
    subtitle: "Pode escolher mais de uma opção.",
  },
  {
    eyebrow: "Pergunta 6 de 10",
    title: "Sobre o que você gostaria de conversar?",
    subtitle: "Pode escolher mais de uma opção.",
  },
  {
    eyebrow: "Pergunta 7 de 10",
    title: "Existe alguma situação real para a qual você quer se preparar?",
    subtitle: "Opcional — ex: uma viagem, entrevista ou reunião.",
  },
  { eyebrow: "Pergunta 8 de 10", title: "Quanto tempo você consegue praticar por dia?" },
  { eyebrow: "Pergunta 9 de 10", title: "Como você quer receber correções?" },
  {
    eyebrow: "Pergunta 10 de 10",
    title: "Qual é sua meta principal?",
    subtitle: "E até quando você gostaria de alcançá-la.",
  },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function deriveCompetencias(dificuldades: OnboardingAnswers["dificuldades"]) {
  const set = new Set(dificuldades.map((d) => DIFICULDADE_INFO[d].competencia));
  if (set.size === 0) set.add("conversacao");
  return Array.from(set);
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`press rounded-full px-4 py-2 text-sm font-medium ${
        disabled
          ? "glass cursor-not-allowed text-muted-foreground/50"
          : active
            ? "glass-dark"
            : "glass text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyAnswers());

  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const skip = () => {
    skipOnboarding();
    navigate({ to: "/" });
  };

  const finish = () => {
    const primeiro = answers.primeiroObjetivo;
    const nivelInfo = NIVEL_INFO[answers.nivel ?? "intermediario"];
    const objetivoText =
      answers.metaPrincipal.trim() ||
      `Quero conseguir ${(primeiro ? OBJETIVO_LABELS[primeiro] : "falar com mais confiança").toLowerCase()}`;
    const situacaoText =
      answers.situacaoReal.trim() || (primeiro ? OBJETIVO_LABELS[primeiro] : "Praticar o idioma");

    createGoal({
      objetivo: objetivoText,
      situacao: situacaoText,
      prazo: answers.prazo,
      frequenciaPorSemana: 3,
      tempoDisponivel: answers.tempoDiario,
      competencias: deriveCompetencias(answers.dificuldades),
      confiancaAtual: nivelInfo.confianca,
    });
    updateProfile({
      name: profile.name,
      level: nivelInfo.level,
      avatarColor: profile.avatarColor,
      avatarExpression: profile.avatarExpression,
    });
    completeOnboarding(answers);
    navigate({ to: "/" });
  };

  const canAdvance = [
    true,
    answers.nivel !== null,
    answers.motivos.length > 0,
    answers.primeiroObjetivo !== null,
    answers.dificuldades.length > 0,
    answers.assuntos.length > 0,
    true,
    true,
    answers.correcaoPref !== null,
    answers.prazo.length > 0,
  ][step];

  const headline = STEP_HEADLINES[step];
  const progressPct = (Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100;

  return (
    <AppShell hideTabs>
      <div className="flex items-center justify-between">
        {step > 0 && step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            aria-label="Voltar"
            className="glass press grid h-11 w-11 place-items-center rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-11 w-11" />
        )}
        {step < TOTAL_STEPS && (
          <button
            onClick={skip}
            className="text-sm text-muted-foreground underline underline-offset-2"
          >
            Pular por enquanto
          </button>
        )}
      </div>

      {step < TOTAL_STEPS && (
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="bg-accent h-full rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {step < TOTAL_STEPS && headline && (
        <div className="mt-6">
          <p className="text-xs font-medium text-muted-foreground">{headline.eyebrow}</p>
          <h1 className="mt-2 font-display text-2xl leading-snug">{headline.title}</h1>
          {headline.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{headline.subtitle}</p>
          )}
        </div>
      )}

      <div className="mt-6">
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Inglês", enabled: true },
              { label: "Espanhol", enabled: false },
              { label: "Francês", enabled: false },
              { label: "Italiano", enabled: false },
              { label: "Alemão", enabled: false },
              { label: "Outro", enabled: false },
            ].map(({ label, enabled }) => (
              <div
                key={label}
                className={`surface rounded-2xl p-4 ${enabled ? "ring-2 ring-accent" : "opacity-50"}`}
              >
                <p className="font-medium">{label}</p>
                {!enabled && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> Em breve
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {NIVEL_LIST.map((n) => {
              const info = NIVEL_INFO[n];
              const active = answers.nivel === n;
              return (
                <button
                  key={n}
                  onClick={() => set("nivel", n)}
                  className={`press w-full rounded-2xl p-4 text-left ${active ? "glass-dark" : "surface"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{info.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-background/20" : "bg-muted text-muted-foreground"}`}
                    >
                      {info.tag}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-sm ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    {info.desc}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {MOTIVO_LIST.map((m) => (
              <Chip
                key={m}
                active={answers.motivos.includes(m)}
                onClick={() => set("motivos", toggle(answers.motivos, m))}
              >
                {MOTIVO_LABELS[m]}
              </Chip>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-wrap gap-2">
            {OBJETIVO_LIST.map((o) => (
              <Chip
                key={o}
                active={answers.primeiroObjetivo === o}
                onClick={() => set("primeiroObjetivo", o)}
              >
                {OBJETIVO_LABELS[o]}
              </Chip>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-wrap gap-2">
            {DIFICULDADE_LIST.map((d) => (
              <Chip
                key={d}
                active={answers.dificuldades.includes(d)}
                onClick={() => set("dificuldades", toggle(answers.dificuldades, d))}
              >
                {DIFICULDADE_INFO[d].label}
              </Chip>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="flex max-h-[50vh] flex-wrap gap-2 overflow-y-auto pb-2">
            {ASSUNTO_LIST.map((a) => (
              <Chip
                key={a}
                active={answers.assuntos.includes(a)}
                onClick={() => set("assuntos", toggle(answers.assuntos, a))}
              >
                {ASSUNTO_LABELS[a]}
              </Chip>
            ))}
          </div>
        )}

        {step === 6 && (
          <textarea
            autoFocus
            value={answers.situacaoReal}
            onChange={(e) => set("situacaoReal", e.target.value)}
            placeholder="Ex: Vou viajar para Londres em dois meses."
            className="min-h-28 w-full rounded-2xl bg-muted px-4 py-3 outline-none"
          />
        )}

        {step === 7 && (
          <div className="flex flex-wrap gap-2">
            {TEMPO_DIARIO_OPTIONS.map((t) => (
              <Chip
                key={t}
                active={answers.tempoDiario === t}
                onClick={() => set("tempoDiario", t)}
              >
                {t} min
              </Chip>
            ))}
          </div>
        )}

        {step === 8 && (
          <div className="flex flex-wrap gap-2">
            {CORRECAO_LIST.map((c) => (
              <Chip
                key={c}
                active={answers.correcaoPref === c}
                onClick={() => set("correcaoPref", c)}
              >
                {CORRECAO_LABELS[c]}
              </Chip>
            ))}
          </div>
        )}

        {step === 9 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Quero conseguir...</p>
              <textarea
                autoFocus
                value={answers.metaPrincipal}
                onChange={(e) => set("metaPrincipal", e.target.value)}
                placeholder="Ex: Participar de reuniões em inglês."
                className="mt-2 min-h-20 w-full rounded-2xl bg-muted px-4 py-3 outline-none"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Até quando?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRAZO_PRESETS.map((p) => {
                  const iso = new Date(Date.now() + p.dias * DAY_MS).toISOString().slice(0, 10);
                  return (
                    <Chip
                      key={p.label}
                      active={answers.prazo === iso}
                      onClick={() => set("prazo", iso)}
                    >
                      {p.label}
                    </Chip>
                  );
                })}
              </div>
              <input
                type="date"
                value={answers.prazo}
                onChange={(e) => set("prazo", e.target.value)}
                className="mt-3 h-12 w-full rounded-2xl bg-muted px-4 outline-none"
              />
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="text-center">
            <div className="bg-accent mx-auto grid h-16 w-16 place-items-center rounded-full">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="mt-5 font-display text-3xl leading-snug">Seu plano está pronto.</h1>
            <div className="surface mt-6 space-y-3 rounded-3xl p-5 text-left">
              <div>
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="mt-0.5 font-medium">
                  {answers.metaPrincipal.trim() ||
                    `Quero conseguir ${(answers.primeiroObjetivo ? OBJETIVO_LABELS[answers.primeiroObjetivo] : "falar com mais confiança").toLowerCase()}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rotina</p>
                <p className="mt-0.5 font-medium">{answers.tempoDiario} min · 3x por semana</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Primeira missão sugerida</p>
                <p className="mt-0.5 font-medium">
                  {answers.primeiroObjetivo
                    ? OBJETIVO_LABELS[answers.primeiroObjetivo]
                    : "Praticar uma conversa do dia a dia"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="glass-dark press flex h-14 w-full items-center justify-center rounded-full font-medium disabled:opacity-50"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={finish}
            className="glass-dark press flex h-14 w-full items-center justify-center rounded-full font-medium"
          >
            Começar a usar o Hi
          </button>
        )}
      </div>
    </AppShell>
  );
}
