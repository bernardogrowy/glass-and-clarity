import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  authErrorMessage,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth-store";
import { isFirebaseConfigured } from "@/lib/firebase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Hi" },
      { name: "description", content: "Entre ou crie sua conta para salvar seu progresso." },
    ],
  }),
  component: Login,
});

type Mode = "entrar" | "criar";

function Login() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const message = authErrorMessage(error);
      if (message) toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() =>
      mode === "entrar" ? signInWithEmail(email, password) : signUpWithEmail(name, email, password),
    );
  }

  function onForgotPassword() {
    if (!email.trim()) {
      toast.error("Digite seu e-mail para receber o link de redefinição.");
      return;
    }
    void run(async () => {
      await resetPassword(email);
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
    });
  }

  const inputClass =
    "h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-display text-4xl text-foreground">Hi</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "entrar"
          ? "Entre para continuar de onde parou."
          : "Crie sua conta para salvar seu progresso."}
      </p>

      {!isFirebaseConfigured && (
        <p className="mt-4 rounded-2xl bg-muted p-3 text-sm text-muted-foreground">
          Firebase ainda não configurado. Preencha as variáveis VITE_FIREBASE_* no .env.local.
        </p>
      )}

      <button
        type="button"
        disabled={busy || !isFirebaseConfigured}
        onClick={() => void run(signInWithGoogle)}
        className="press glass mt-8 flex h-12 items-center justify-center gap-3 rounded-full font-medium text-foreground disabled:opacity-50"
      >
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
        Continuar com Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "criar" && (
          <input
            className={inputClass}
            placeholder="Seu nome"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className={inputClass}
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Senha"
          autoComplete={mode === "entrar" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !isFirebaseConfigured}
          className="press glass-dark mt-2 h-12 rounded-full font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      {mode === "entrar" && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="mt-4 text-sm text-muted-foreground underline"
        >
          Esqueci minha senha
        </button>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")}
        className="mt-6 text-sm text-foreground"
      >
        {mode === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
