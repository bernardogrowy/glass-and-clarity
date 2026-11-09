import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Settings2,
  Layers,
  Target,
  Check,
  ListChecks,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MascotAvatar } from "@/components/MascotAvatar";
import { SrsSettingsSheet } from "@/components/SrsSettingsSheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getVocabMasteryPct, useFlashcardsStore } from "@/lib/flashcards-store";
import {
  ASSUNTO_LABELS,
  CORRECAO_LABELS,
  MOTIVO_LABELS,
  NIVEL_INFO,
  resetOnboarding,
  useOnboardingStore,
} from "@/lib/onboarding-store";
import { useProgressStore } from "@/lib/progress-store";
import {
  AVATAR_COLORS,
  AVATAR_EXPRESSIONS,
  LEVELS,
  updateProfile,
  useProfileStore,
  type AvatarExpression,
  type Level,
} from "@/lib/profile-store";
import { useStreakStore } from "@/lib/streak-store";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Hi" },
      { name: "description", content: "Seu perfil, o curso atual e suas preferências." },
      { property: "og:title", content: "Perfil — Hi" },
      { property: "og:description", content: "Seu perfil, o curso atual e suas preferências." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const flashcards = useFlashcardsStore();
  const progress = useProgressStore();
  const streak = useStreakStore();
  const onboarding = useOnboardingStore();

  const [editOpen, setEditOpen] = useState(false);
  const [srsOpen, setSrsOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [level, setLevel] = useState<Level>(profile.level);
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
  const [avatarExpression, setAvatarExpression] = useState<AvatarExpression>(
    profile.avatarExpression,
  );

  const openEdit = () => {
    setName(profile.name);
    setLevel(profile.level);
    setAvatarColor(profile.avatarColor);
    setAvatarExpression(profile.avatarExpression);
    setEditOpen(true);
  };

  const saveEdit = () => {
    updateProfile({ name, level, avatarColor, avatarExpression });
    setEditOpen(false);
  };

  const vocabMasteryPct = getVocabMasteryPct(flashcards);

  const retakeOnboarding = () => {
    resetOnboarding();
    navigate({ to: "/onboarding" });
  };

  return (
    <AppShell hideTabs>
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/" })}
          aria-label="Voltar"
          className="glass press grid h-11 w-11 place-items-center rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-medium">Perfil</p>
        <div className="h-11 w-11" />
      </div>

      <div className="surface mt-6 rounded-3xl p-6 text-center">
        <div className="flex justify-center">
          <MascotAvatar
            color={profile.avatarColor}
            expression={profile.avatarExpression}
            size={80}
          />
        </div>
        <h1 className="mt-4 font-display text-2xl">{profile.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprendendo inglês · Nível {profile.level}
        </p>
        <button
          onClick={openEdit}
          className="glass-dark press mt-5 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Editar perfil
        </button>
      </div>

      <h2 className="mt-8 mb-4 font-display text-xl">Curso atual</h2>
      <div className="surface rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Inglês</p>
            <p className="text-xs text-muted-foreground">Nível {profile.level}</p>
          </div>
          <span className="bg-butter rounded-full px-3 py-1 text-xs font-medium text-foreground">
            Em andamento
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-display text-xl">{streak.current}</p>
            <p className="text-xs text-muted-foreground">dias seguidos</p>
          </div>
          <div>
            <p className="font-display text-xl">{flashcards.decks.length}</p>
            <p className="text-xs text-muted-foreground">baralhos</p>
          </div>
          <div>
            <p className="font-display text-xl">{progress.goals.length}</p>
            <p className="text-xs text-muted-foreground">metas ativas</p>
          </div>
        </div>
        {vocabMasteryPct !== null && (
          <p className="mt-4 text-xs text-muted-foreground">
            {vocabMasteryPct}% do vocabulário já dominado.
          </p>
        )}
      </div>

      <h2 className="mt-8 mb-4 font-display text-xl">Preferências</h2>
      <div className="space-y-3">
        <button
          onClick={() => setPrefsOpen(true)}
          className="surface press flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            Questionário inicial
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => setSrsOpen(true)}
          className="surface press flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Repetição espaçada
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <Link
          to="/baralhos"
          className="surface press flex w-full items-center justify-between rounded-2xl px-5 py-4"
        >
          <span className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Meus baralhos
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/progresso"
          className="surface press flex w-full items-center justify-between rounded-2xl px-5 py-4"
        >
          <span className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            Minhas metas
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="surface max-h-[85vh] overflow-y-auto rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <MascotAvatar color={avatarColor} expression={avatarExpression} size={72} />
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="h-12 w-full rounded-2xl bg-muted px-4 outline-none"
            />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Nível atual de inglês</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`press rounded-full px-4 py-2 text-sm font-medium ${
                      level === l ? "glass-dark" : "glass text-muted-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Cor do avatar</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    aria-label={`Cor ${c}`}
                    style={{ backgroundColor: c }}
                    className="press grid h-9 w-9 place-items-center rounded-full"
                  >
                    {avatarColor === c && (
                      <Check className="h-4 w-4" style={{ color: "#1B2140" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Expressão</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EXPRESSIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setAvatarExpression(e)}
                    aria-label={e}
                    className={`press grid h-12 w-12 place-items-center rounded-full ${
                      avatarExpression === e ? "glass-dark" : "glass"
                    }`}
                  >
                    <MascotAvatar color={avatarColor} expression={e} size={34} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={saveEdit}
              disabled={!name.trim()}
              className="glass-dark press flex h-12 w-full items-center justify-center rounded-2xl font-medium disabled:opacity-50"
            >
              Salvar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SrsSettingsSheet open={srsOpen} onOpenChange={setSrsOpen} settings={flashcards.settings} />

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="surface max-h-[85vh] overflow-y-auto rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Questionário inicial</DialogTitle>
          </DialogHeader>
          {onboarding.completed ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Nível ao se cadastrar</p>
                <p className="mt-0.5 font-medium">
                  {onboarding.answers.nivel ? NIVEL_INFO[onboarding.answers.nivel].label : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Motivos</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {onboarding.answers.motivos.length > 0 ? (
                    onboarding.answers.motivos.map((m) => (
                      <span key={m} className="bg-muted rounded-full px-3 py-1 text-xs">
                        {MOTIVO_LABELS[m]}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum selecionado</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assuntos de interesse</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {onboarding.answers.assuntos.length > 0 ? (
                    onboarding.answers.assuntos.map((a) => (
                      <span key={a} className="bg-muted rounded-full px-3 py-1 text-xs">
                        {ASSUNTO_LABELS[a]}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum selecionado</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Preferência de correção</p>
                <p className="mt-0.5 font-medium">
                  {onboarding.answers.correcaoPref
                    ? CORRECAO_LABELS[onboarding.answers.correcaoPref]
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não respondeu o questionário inicial.
            </p>
          )}
          <DialogFooter>
            <button
              onClick={retakeOnboarding}
              className="glass press flex h-12 w-full items-center justify-center rounded-2xl font-medium"
            >
              {onboarding.completed ? "Refazer questionário" : "Responder agora"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
