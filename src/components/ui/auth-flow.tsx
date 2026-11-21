import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { MascotAvatar } from "@/components/MascotAvatar";
import { AVATAR_COLORS, type AvatarExpression } from "@/lib/profile-store";
import { cn } from "@/lib/utils";

export type AuthMode = "entrar" | "criar";
type Step = "email" | "senha" | "nome";

export type AuthFlowProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Bloqueia os botões enquanto uma chamada ao Firebase está em andamento. */
  busy: boolean;
  /** `true` quando o Firebase não está configurado (ou a ação não pode ser feita). */
  disabled?: boolean;
  /** Aviso opcional exibido acima do formulário (ex.: Firebase não configurado). */
  notice?: ReactNode;
  onGoogle: () => void;
  onSubmit: (data: { name: string; email: string; password: string }) => void;
  onForgotPassword: (email: string) => void;
};

const EMAIL_RE = /\S+@\S+\.\S+/;
const MIN_PASSWORD = 6;

const COPY: Record<Step, { title: Record<AuthMode, string>; subtitle: Record<AuthMode, string> }> =
  {
    email: {
      title: { entrar: "Que bom te ver", criar: "Vamos começar" },
      subtitle: {
        entrar: "Entre para continuar de onde parou.",
        criar: "Crie sua conta para salvar seu progresso.",
      },
    },
    senha: {
      title: { entrar: "Sua senha", criar: "Crie uma senha" },
      subtitle: {
        entrar: "Digite a senha da sua conta.",
        criar: `Use pelo menos ${MIN_PASSWORD} caracteres.`,
      },
    },
    nome: {
      title: { entrar: "", criar: "Como te chamamos?" },
      subtitle: { entrar: "", criar: "É assim que o Hi vai falar com você." },
    },
  };

const MASCOT_EXPRESSION: Record<Step, AvatarExpression> = {
  email: "sorriso",
  senha: "piscada",
  nome: "sorriso",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

/** Fundo: manchas desfocadas com as cores pastel do app (mint, sky, lilac, peach). */
function SoftBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="anim-float-a absolute -left-24 top-10 h-72 w-72 rounded-full bg-mint opacity-70 blur-3xl" />
      <div className="anim-float-b absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-sky opacity-70 blur-3xl" />
      <div className="anim-float-a absolute -bottom-16 left-1/4 h-72 w-72 rounded-full bg-lilac opacity-50 blur-3xl" />
      <div className="anim-float-b absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-peach opacity-50 blur-3xl" />
    </div>
  );
}

/**
 * Entrada do app em passos (e-mail → senha → nome), no estilo "liquid glass" do Hi.
 * É só apresentação: quem usa decide o que acontece em cada callback (Firebase, toasts…).
 */
export function AuthFlow({
  mode,
  onModeChange,
  busy,
  disabled = false,
  notice,
  onGoogle,
  onSubmit,
  onForgotPassword,
}: AuthFlowProps) {
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAdvanced = useRef(false);

  const steps: Step[] = mode === "entrar" ? ["email", "senha"] : ["email", "senha", "nome"];
  const isLastStep = step === steps[steps.length - 1];
  const locked = busy || disabled;

  const valid =
    step === "email"
      ? EMAIL_RE.test(email.trim())
      : step === "senha"
        ? password.length >= MIN_PASSWORD
        : true;

  // Depois do 1º passo, leva o foco para o campo novo (no 1º não abre o teclado sem a pessoa pedir).
  useEffect(() => {
    if (hasAdvanced.current) inputRef.current?.focus();
  }, [step]);

  function changeMode(next: AuthMode) {
    setStep("email");
    setShowPassword(false);
    onModeChange(next);
  }

  function goBack() {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1] as Step);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || locked) return;
    if (!isLastStep) {
      hasAdvanced.current = true;
      setStep(steps[steps.indexOf(step) + 1] as Step);
      return;
    }
    onSubmit({ name, email, password });
  }

  const copy = COPY[step];
  const buttonLabel = busy
    ? "Aguarde…"
    : !isLastStep
      ? "Continuar"
      : mode === "entrar"
        ? "Entrar"
        : "Criar conta";

  const fieldClass =
    "glass flex h-14 items-center gap-3 rounded-full pl-5 pr-3 transition-shadow focus-within:ring-2 focus-within:ring-ring";
  const inputClass =
    "h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SoftBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="flex flex-col items-center">
          <div className="anim-tag-bob">
            <MascotAvatar
              color={AVATAR_COLORS[7] ?? "#4FD1C5"}
              expression={MASCOT_EXPRESSION[step]}
              size={72}
            />
          </div>
          <p className="mt-2 font-display text-2xl text-foreground">Hi</p>
        </div>

        <div
          key={step}
          className="mt-8 text-center duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
        >
          <h1 className="font-display text-4xl leading-tight text-foreground">
            {copy.title[mode]}
          </h1>
          <p className="mt-2 text-muted-foreground">{copy.subtitle[mode]}</p>
        </div>

        {notice && (
          <div className="surface mt-6 rounded-2xl p-3 text-center text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        {step === "email" && (
          <>
            <button
              type="button"
              disabled={locked}
              onClick={onGoogle}
              className="press glass mt-8 flex h-12 items-center justify-center gap-3 rounded-full font-medium text-foreground disabled:opacity-50"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form
          onSubmit={handleSubmit}
          className={cn("flex flex-col gap-3", step !== "email" && "mt-8")}
        >
          {/* Mantém o e-mail no formulário para o gerenciador de senhas salvar o par certo. */}
          {step !== "email" && (
            <input
              type="email"
              autoComplete="username"
              value={email}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
          )}

          <div
            key={step}
            className="flex flex-col gap-3 duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
          >
            {step === "email" && (
              <label className={fieldClass}>
                <Mail className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">E-mail</span>
                <input
                  ref={inputRef}
                  className={inputClass}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}

            {step === "senha" && (
              <label className={fieldClass}>
                <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Senha</span>
                <input
                  ref={inputRef}
                  className={inputClass}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </label>
            )}

            {step === "nome" && (
              <label className={fieldClass}>
                <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Seu nome</span>
                <input
                  ref={inputRef}
                  className={inputClass}
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome (opcional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={!valid || locked}
            className="press glass-dark mt-2 h-12 rounded-full font-medium text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {buttonLabel}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          {step !== "email" ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar
            </button>
          ) : (
            <span />
          )}
          {mode === "entrar" && step === "senha" && (
            <button
              type="button"
              disabled={locked}
              onClick={() => onForgotPassword(email)}
              className="text-muted-foreground underline disabled:opacity-50"
            >
              Esqueci minha senha
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => changeMode(mode === "entrar" ? "criar" : "entrar")}
          className="mt-6 text-center text-sm text-foreground"
        >
          {mode === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
