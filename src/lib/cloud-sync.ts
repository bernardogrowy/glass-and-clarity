import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getFirebase } from "./firebase";

/**
 * Liga um store local (localStorage + useSyncExternalStore) a um documento do Firestore:
 * `users/{uid}/data/{field}`. Cada store tem o seu documento (limite de 1 MB por documento).
 *
 * - A nuvem é a fonte da verdade: ao abrir o app o estado local é substituído pelo da nuvem.
 * - Conta nova (documento ainda não existe no servidor): começa do estado vazio do store,
 *   descartando qualquer sobra local (dados de protótipo, outra conta no mesmo aparelho).
 * - Mudanças locais são gravadas com um pequeno debounce. O SDK do Firestore reenvia gravações
 *   pendentes quando a conexão volta.
 */
export type CloudBinding<T extends object> = {
  /** Nome do documento dentro de users/{uid}/data. */
  field: string;
  /** Estado inicial de uma conta nova. */
  empty: () => T;
  /** Lê o estado local atual. */
  get: () => T;
  /** Substitui o estado local pelo valor vindo da nuvem (normalizando campos que faltam). */
  replace: (value: T) => void;
  /** Assina mudanças locais; devolve a função de cancelar. */
  subscribe: (listener: () => void) => () => void;
  /** Ajusta o estado inicial de uma conta nova (ex.: nome vindo do login com Google). */
  seed?: (empty: T, user: { displayName: string | null }) => T;
};

export type CloudSync = {
  stop: () => void;
  /** Grava na hora qualquer mudança que ainda esteja esperando o debounce. */
  flush: () => Promise<void>;
};

const WRITE_DEBOUNCE_MS = 400;
const active = new Set<CloudSync>();

/** Grava tudo que está pendente. Use antes de sair da conta. */
export async function flushCloudSync(): Promise<void> {
  await Promise.all([...active].map((sync) => sync.flush()));
}

export function startCloudSync<T extends object>(
  uid: string,
  binding: CloudBinding<T>,
  onReady: () => void,
): CloudSync {
  const fb = getFirebase();
  if (!fb) {
    onReady();
    return { stop: () => {}, flush: async () => {} };
  }

  const ref = doc(fb.db, "users", uid, "data", binding.field);
  let applyingRemote = false;
  let dirty = false;
  let ready = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const markReady = () => {
    if (ready) return;
    ready = true;
    onReady();
  };

  const write = async (value: T) => {
    // JSON round-trip remove `undefined`, que o Firestore rejeita.
    const clean = JSON.parse(JSON.stringify(value)) as T;
    try {
      await setDoc(ref, clean);
    } catch (error) {
      console.error(`[cloud-sync] falha ao gravar "${binding.field}"`, error);
    }
  };

  const push = async () => {
    clearTimeout(timer);
    timer = undefined;
    dirty = false;
    await write(binding.get());
  };

  const applyRemote = (value: T) => {
    applyingRemote = true;
    try {
      binding.replace(value);
    } finally {
      applyingRemote = false;
    }
  };

  const unsubscribeLocal = binding.subscribe(() => {
    if (applyingRemote) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => void push(), WRITE_DEBOUNCE_MS);
  });

  const unsubscribeRemote = onSnapshot(
    ref,
    (snap) => {
      // Mudança local ainda não confirmada: o estado local é o mais novo.
      if (snap.metadata.hasPendingWrites || dirty) {
        markReady();
        return;
      }
      if (!snap.exists()) {
        // Offline/sem cache: ainda não sabemos se existe — esperar o servidor, nunca sobrescrever.
        if (snap.metadata.fromCache) return;
        const user = fb.auth.currentUser;
        const base = binding.empty();
        const initial = binding.seed
          ? binding.seed(base, { displayName: user?.displayName ?? null })
          : base;
        applyRemote(initial);
        void write(initial);
        markReady();
        return;
      }
      applyRemote(snap.data() as T);
      markReady();
    },
    (error) => {
      console.error(`[cloud-sync] falha ao ler "${binding.field}"`, error);
      markReady(); // não trava o app; segue com o que há localmente
    },
  );

  const sync: CloudSync = {
    flush: async () => {
      if (dirty) await push();
    },
    stop: () => {
      if (dirty) void push();
      clearTimeout(timer);
      unsubscribeLocal();
      unsubscribeRemote();
      active.delete(sync);
    },
  };
  active.add(sync);
  return sync;
}
