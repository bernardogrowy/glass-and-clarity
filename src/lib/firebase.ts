import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

// Acesso estático de propósito (ver vite-env.d.ts): nada de `const env = import.meta.env`.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const appId = import.meta.env.VITE_FIREBASE_APP_ID;

/** `false` enquanto o `.env.local` não tiver as chaves VITE_FIREBASE_* preenchidas. */
export const isFirebaseConfigured = Boolean(apiKey && projectId && appId);

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * App Check: prova ao Firebase (Firestore, IA…) que a requisição vem do app de verdade.
 * Em desenvolvimento usa o token de debug (registrado no console), porque o reCAPTCHA só
 * aceita domínios — não localhost/IP da rede.
 */
function setupAppCheck(firebaseApp: FirebaseApp) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;

  if (import.meta.env.DEV) {
    // Bloco removido do build de produção: o token de debug nunca vai para o site publicado.
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
  }

  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Só use no cliente (efeitos, handlers). No SSR do `vite dev` não há `window`,
 * então devolvemos `null` em vez de inicializar o SDK no servidor.
 */
export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } | null {
  if (typeof window === "undefined" || !isFirebaseConfigured) return null;

  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey: apiKey ?? "",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
        projectId: projectId ?? "",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
        appId: appId ?? "",
      });
    setupAppCheck(app); // antes de qualquer outro serviço
    auth = getAuth(app);
    db = getFirestore(app);
    if (useEmulators) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
  }
  return { app, auth: auth as Auth, db: db as Firestore };
}
