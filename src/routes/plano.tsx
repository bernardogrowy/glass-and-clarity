import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BellRing, ChevronLeft, FileSignature, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { COMPETENCY_INFO, COMPETENCY_LIST, type Competency } from "@/lib/progress-store";
import {
  getNotificationSupport,
  getPermission,
  requestNotificationPermission,
} from "@/lib/smart-notifications";
import {
  GOAL_KIND_INFO,
  GOAL_KIND_LIST,
  LEAD_OPTIONS,
  SLOT_MINUTE_OPTIONS,
  WEEKDAY_LONG,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  draftCommitment,
  getStudyPlan,
  isPlanReady,
  signPlan,
  type GoalKind,
  type StudyPlan,
  type Weekday,
} from "@/lib/study-plan-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plano")({
  head: () => ({
    meta: [
      { title: "Contrato de estudo — Hi" },
      {
        name: "description",
        content:
          "Escreva seu plano de estudo — objetivo, foco e horários — e receba lembretes que cobram o plano, não a sequência.",
      },
      { property: "og:title", content: "Contrato de estudo — Hi" },
      {
        property: "og:description",
        content: "Seu objetivo, sua rotina e lembretes inteligentes ligados ao plano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanoPage,
});

const MAX_FOCUS = 3;
const DEFAULT_TIME = "19:00";

function Chip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "press rounded-full px-4 py-2.5 text-sm font-medium",
        active ? "glass-dark" : "glass",
      )}
    >
      {children}
    </button>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface mt-4 rounded-3xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Passo {step}</p>
      <h2 className="mt-1 font-display text-2xl leading-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-input bg-background/70 px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PlanoPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StudyPlan | null>(null);
  const [permission, setPermission] = useState<ReturnType<typeof getPermission>>("unsupported");
  const support = getNotificationSupport();

  // Carrega no cliente (o snapshot de servidor é o plano vazio).
  useEffect(() => {
    setDraft(getStudyPlan());
    setPermission(getPermission());
  }, []);

  if (!draft) return <AppShell hideTabs>{null}</AppShell>;

  /** Atualiza o rascunho; o texto do contrato acompanha, a menos que a pessoa o tenha editado. */
  const update = (patch: (p: StudyPlan) => StudyPlan) =>
    setDraft((current) => {
      if (!current) return current;
      const next = patch(current);
      return next.commitmentEdited ? next : { ...next, commitment: draftCommitment(next) };
    });

  const toggleDay = (weekday: Weekday) =>
    update((p) => {
      const has = p.slots.some((s) => s.weekday === weekday);
      return {
        ...p,
        slots: has
          ? p.slots.filter((s) => s.weekday !== weekday)
          : [...p.slots, { id: `w${weekday}`, weekday, time: DEFAULT_TIME, minutes: 20 }],
      };
    });

  const toggleFocus = (c: Competency) =>
    update((p) => {
      if (p.focus.includes(c)) return { ...p, focus: p.focus.filter((x) => x !== c) };
      if (p.focus.length >= MAX_FOCUS) {
        toast(`Escolha até ${MAX_FOCUS} focos — o plano fica mais claro assim.`);
        return p;
      }
      return { ...p, focus: [...p.focus, c] };
    });

  /**
   * Os avisos dentro do app (banner, sino e central) sempre funcionam. A notificação do sistema é um
   * extra: só com HTTPS e permissão. Negar a permissão não impede os avisos dentro do app.
   */
  const toggleNotifications = async (on: boolean) => {
    update((p) => ({ ...p, notifications: { ...p.notifications, enabled: on } }));
    if (!on) return;
    if (support === "ok" && permission === "default") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === "denied") toast("Sem problema: eu aviso aqui dentro do app.");
    }
  };

  const ready = isPlanReady(draft);
  const kindInfo = GOAL_KIND_INFO[draft.goal.kind];
  const today = new Date().toISOString().slice(0, 10);

  const save = () => {
    signPlan({ ...draft, commitment: draft.commitment.trim() || draftCommitment(draft) });
    toast.success(
      draft.signed ? "Contrato atualizado." : "Contrato assinado. Agora eu cobro por ele.",
    );
    void navigate({ to: "/" });
  };

  return (
    <AppShell hideTabs>
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Voltar"
          className="glass press grid h-11 w-11 place-items-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-muted-foreground">Seu plano</p>
      </header>

      <h1 className="mt-6 font-display text-4xl leading-[1.05]">Contrato de estudo</h1>
      <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
        Um acordo seu, com você. Eu cobro o plano que você escrever — pelo seu objetivo, não por
        número de dias seguidos. Se um dia não rolar, a gente ajusta o plano, sem culpa.
      </p>

      <Section step={1} title="O que você quer alcançar?" hint="É daqui que vem a cobrança.">
        <div className="flex flex-wrap gap-2">
          {GOAL_KIND_LIST.map((kind: GoalKind) => (
            <Chip
              key={kind}
              active={draft.goal.kind === kind}
              onClick={() => update((p) => ({ ...p, goal: { ...p.goal, kind } }))}
            >
              {GOAL_KIND_INFO[kind].label}
            </Chip>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Qual?
            <input
              className={cn(fieldClass, "mt-1.5")}
              value={draft.goal.title}
              maxLength={80}
              placeholder={kindInfo.titleHint}
              onChange={(e) =>
                update((p) => ({ ...p, goal: { ...p.goal, title: e.target.value } }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Meta (opcional)
            <input
              className={cn(fieldClass, "mt-1.5")}
              value={draft.goal.target}
              maxLength={60}
              placeholder={kindInfo.targetHint}
              onChange={(e) =>
                update((p) => ({ ...p, goal: { ...p.goal, target: e.target.value } }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Data da prova ou prazo (opcional)
            <input
              type="date"
              min={today}
              className={cn(fieldClass, "mt-1.5")}
              value={draft.goal.deadline ?? ""}
              onChange={(e) =>
                update((p) => ({ ...p, goal: { ...p.goal, deadline: e.target.value || null } }))
              }
            />
          </label>
        </div>
      </Section>

      <Section
        step={2}
        title="No que quer focar?"
        hint={`Até ${MAX_FOCUS}. Cada bloco da semana gira por essas áreas.`}
      >
        <div className="flex flex-wrap gap-2">
          {COMPETENCY_LIST.map((c) => (
            <Chip key={c} active={draft.focus.includes(c)} onClick={() => toggleFocus(c)}>
              {COMPETENCY_INFO[c].label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section
        step={3}
        title="Quando você estuda?"
        hint="Escolha os dias e o horário de cada um. Seja realista: um plano pequeno que cabe vale mais."
      >
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_ORDER.map((d) => (
            <Chip
              key={d}
              active={draft.slots.some((s) => s.weekday === d)}
              onClick={() => toggleDay(d)}
              label={WEEKDAY_LONG[d]}
            >
              {WEEKDAY_SHORT[d]}
            </Chip>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {WEEKDAY_ORDER.map((d) => draft.slots.find((s) => s.weekday === d))
            .filter((s): s is NonNullable<typeof s> => !!s)
            .map((slot) => (
              <div key={slot.id} className="flex items-center gap-3">
                <span className="w-12 text-sm font-semibold">{WEEKDAY_SHORT[slot.weekday]}</span>
                <input
                  type="time"
                  aria-label={`Horário de ${WEEKDAY_LONG[slot.weekday]}`}
                  className={cn(fieldClass, "flex-1")}
                  value={slot.time}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      slots: p.slots.map((s) =>
                        s.id === slot.id ? { ...s, time: e.target.value || DEFAULT_TIME } : s,
                      ),
                    }))
                  }
                />
                <select
                  aria-label={`Duração de ${WEEKDAY_LONG[slot.weekday]}`}
                  className={cn(fieldClass, "w-28 flex-none")}
                  value={slot.minutes}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      slots: p.slots.map((s) =>
                        s.id === slot.id ? { ...s, minutes: Number(e.target.value) } : s,
                      ),
                    }))
                  }
                >
                  {SLOT_MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
            ))}
          {draft.slots.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum dia escolhido ainda.</p>
          )}
        </div>
      </Section>

      <Section
        step={4}
        title="Lembretes inteligentes"
        hint="Avisos ligados ao seu plano: o bloco de hoje, quantos dias faltam e uma pergunta se ele não rolar."
      >
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3 text-[15px] font-medium">
            <BellRing className="h-5 w-5 text-muted-foreground" />
            Ativar lembretes do mentor
          </span>
          <Switch
            checked={draft.notifications.enabled}
            onCheckedChange={(on) => void toggleNotifications(on)}
            aria-label="Ativar notificações"
          />
        </div>
        {draft.notifications.enabled && (
          <label className="mt-4 block text-sm font-medium">
            Avisar antes do bloco
            <select
              className={cn(fieldClass, "mt-1.5")}
              value={draft.notifications.leadMinutes}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  notifications: { ...p.notifications, leadMinutes: Number(e.target.value) },
                }))
              }
            >
              {LEAD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "Na hora" : `${m} minutos antes`}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="mt-4 flex gap-2 rounded-2xl bg-butter/60 p-3 text-xs leading-snug text-foreground/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {support === "ok" && permission === "granted"
            ? "Os avisos aparecem no app e, com o app em segundo plano, como notificação do celular. Com o app fechado, é preciso um servidor de push (ainda não configurado)."
            : support === "ok" && permission === "denied"
              ? "As notificações do sistema estão bloqueadas para este site. Os avisos continuam aparecendo dentro do app; para receber no celular, libere nas configurações do navegador."
              : support === "insecure"
                ? "Os avisos aparecem dentro do app (banner e sino). A notificação do celular exige uma página segura (https) e vai funcionar quando o app estiver publicado."
                : support === "unsupported"
                  ? "Este navegador não oferece notificações do sistema. Os avisos aparecem dentro do app."
                  : "Os avisos aparecem dentro do app. Ao ativar, o navegador pede permissão para também avisar como notificação do celular."}
        </p>
      </Section>

      <Section step={5} title="Seu contrato" hint="Eu escrevi um rascunho. Edite como quiser.">
        <textarea
          className="min-h-32 w-full rounded-2xl border border-input bg-background/70 p-4 text-[15px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={draft.commitment}
          onChange={(e) =>
            setDraft((p) => p && { ...p, commitment: e.target.value, commitmentEdited: true })
          }
          placeholder="Preencha os passos acima para eu escrever o rascunho."
        />
        {draft.commitmentEdited && (
          <button
            type="button"
            onClick={() =>
              update((p) => ({ ...p, commitmentEdited: false, commitment: draftCommitment(p) }))
            }
            className="mt-2 text-sm font-medium underline underline-offset-4"
          >
            Voltar ao rascunho automático
          </button>
        )}
      </Section>

      <button
        type="button"
        onClick={save}
        disabled={!ready}
        className="glass-dark press mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full font-medium disabled:opacity-50"
      >
        <FileSignature className="h-5 w-5" />
        {draft.signed ? "Salvar alterações" : "Assinar contrato"}
      </button>
      {!ready && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Falta dizer o objetivo e escolher ao menos um dia.
        </p>
      )}
    </AppShell>
  );
}
