import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthFlow, type AuthMode } from "@/components/ui/auth-flow";
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

function Login() {
  const [mode, setMode] = useState<AuthMode>("entrar");
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

  return (
    <AuthFlow
      mode={mode}
      onModeChange={setMode}
      busy={busy}
      disabled={!isFirebaseConfigured}
      notice={
        !isFirebaseConfigured
          ? "Firebase ainda não configurado. Preencha as variáveis VITE_FIREBASE_* no .env.local."
          : undefined
      }
      onGoogle={() => void run(signInWithGoogle)}
      onSubmit={({ name, email, password }) =>
        void run(() =>
          mode === "entrar"
            ? signInWithEmail(email, password)
            : signUpWithEmail(name, email, password),
        )
      }
      onForgotPassword={(email) => {
        if (!email.trim()) {
          toast.error("Digite seu e-mail para receber o link de redefinição.");
          return;
        }
        void run(async () => {
          await resetPassword(email);
          toast.success("Enviamos um link de redefinição para o seu e-mail.");
        });
      }}
    />
  );
}
