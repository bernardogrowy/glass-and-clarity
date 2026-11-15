import { useSyncExternalStore } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { flushCloudSync } from "./cloud-sync";
import { getFirebase, isFirebaseConfigured } from "./firebase";

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "signed-out"; user: null }
  | { status: "signed-in"; user: User };

const LOADING: AuthState = { status: "loading", user: null };
const SIGNED_OUT: AuthState = { status: "signed-out", user: null };

let state: AuthState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function start() {
  if (started) return;
  // Sem Firebase configurado o app segue funcionando localmente (estado fica "loading"
  // e o AuthGate não bloqueia nada).
  const fb = getFirebase();
  if (!fb) return;
  started = true;
  onAuthStateChanged(fb.auth, (user) => {
    setState(user ? { status: "signed-in", user } : SIGNED_OUT);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthState {
  return state;
}

// No servidor (e no 1º render do cliente) sempre "loading": evita redirecionar antes de saber.
function getServerSnapshot(): AuthState {
  return LOADING;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function requireFirebase() {
  const fb = getFirebase();
  if (!fb) {
    throw new Error(
      isFirebaseConfigured
        ? "Firebase só pode ser usado no navegador."
        : "Firebase não configurado. Preencha as variáveis VITE_FIREBASE_* no .env.local.",
    );
  }
  return fb;
}

export async function signInWithGoogle() {
  const { auth } = requireFirebase();
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string) {
  const { auth } = requireFirebase();
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(name: string, email: string, password: string) {
  const { auth } = requireFirebase();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) await updateAuthProfile(cred.user, { displayName: name.trim() });
}

export async function resetPassword(email: string) {
  const { auth } = requireFirebase();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOut() {
  const { auth } = requireFirebase();
  // Grava o que ainda estiver esperando o debounce: depois do logout as regras negariam a escrita.
  await flushCloudSync();
  await firebaseSignOut(auth);
  // Os stores guardam um cache local em "hi.*". Limpa e recarrega para que a próxima
  // conta no mesmo aparelho não herde (nem suba para a nuvem) dados da anterior.
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("hi."))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage indisponível — nada a limpar
  }
  window.location.assign("/login");
}

/** Traduz os códigos de erro mais comuns do Firebase Auth para mensagens amigáveis. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/missing-password":
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com esse e-mail.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "O navegador bloqueou o popup. Libere popups para este site.";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique sua internet.";
    default:
      return error instanceof Error ? error.message : "Algo deu errado. Tente novamente.";
  }
}
