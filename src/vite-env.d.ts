/// <reference types="vite/client" />

// Variáveis do .env.local. Sempre acesse de forma estática (import.meta.env.VITE_X): assim o
// Vite embute só o que é usado e remove o que está dentro de `if (import.meta.env.DEV)`.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  /** Chave de site do reCAPTCHA Enterprise usada pelo App Check. */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
  /** Só desenvolvimento: token de debug registrado no App Check. NUNCA vai para o build. */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
  /** Modelo do Firebase AI Logic (padrão definido em src/lib/ai.ts). */
  readonly VITE_AI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
