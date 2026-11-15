import { beforeEach, describe, expect, it, vi } from "vitest";

type SnapHandler = (snap: unknown) => void;

const firestore = vi.hoisted(() => ({
  handler: null as null | ((snap: unknown) => void),
  setDoc: vi.fn().mockResolvedValue(undefined),
  paths: [] as string[][],
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => {
    firestore.paths.push(path);
    return { path };
  },
  setDoc: firestore.setDoc,
  onSnapshot: (_ref: unknown, next: SnapHandler) => {
    firestore.handler = next;
    return () => {};
  },
}));

vi.mock("@/lib/firebase", () => ({
  getFirebase: () => ({ db: {}, auth: { currentUser: { displayName: "Ana Souza" } } }),
}));

import { startCloudSync, type CloudBinding } from "@/lib/cloud-sync";

type Todo = { items: string[] };

function makeBinding() {
  let state: Todo = { items: ["sobra local"] };
  const listeners = new Set<() => void>();
  const set = (next: Todo) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const binding: CloudBinding<Todo> = {
    field: "todo",
    empty: () => ({ items: [] }),
    get: () => state,
    replace: (value) => set(value),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  return { binding, set, read: () => state };
}

const snap = (data: unknown, meta: { fromCache?: boolean; hasPendingWrites?: boolean } = {}) => ({
  exists: () => data !== undefined,
  data: () => data,
  metadata: { fromCache: false, hasPendingWrites: false, ...meta },
});

describe("cloud-sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    firestore.setDoc.mockClear();
    firestore.paths.length = 0;
    firestore.handler = null;
  });

  it("grava em users/{uid}/data/{field}", () => {
    const { binding } = makeBinding();
    startCloudSync("u1", binding, () => {});
    expect(firestore.paths[0]).toEqual(["users", "u1", "data", "todo"]);
  });

  it("conta nova: descarta o que havia no aparelho e começa vazia", () => {
    const { binding, read } = makeBinding();
    const ready = vi.fn();
    startCloudSync("u1", binding, ready);

    firestore.handler?.(snap(undefined));

    expect(read()).toEqual({ items: [] });
    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { items: [] });
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it("conta nova usa o seed (ex.: nome do Google)", () => {
    const { binding, read } = makeBinding();
    const seeded: CloudBinding<Todo> = {
      ...binding,
      seed: (empty, user) => ({ items: [...empty.items, user.displayName ?? ""] }),
    };
    startCloudSync("u1", seeded, () => {});
    firestore.handler?.(snap(undefined));
    expect(read()).toEqual({ items: ["Ana Souza"] });
  });

  it("offline sem cache NÃO sobrescreve a nuvem com estado vazio", () => {
    const { binding, read } = makeBinding();
    const ready = vi.fn();
    startCloudSync("u1", binding, ready);

    firestore.handler?.(snap(undefined, { fromCache: true }));

    expect(read()).toEqual({ items: ["sobra local"] });
    expect(firestore.setDoc).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
  });

  it("conta existente: a nuvem substitui o local e não gera eco de gravação", () => {
    const { binding, read } = makeBinding();
    startCloudSync("u1", binding, () => {});

    firestore.handler?.(snap({ items: ["a", "b"] }));
    vi.advanceTimersByTime(1000);

    expect(read()).toEqual({ items: ["a", "b"] });
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("mudança local é gravada com debounce, uma vez só", () => {
    const { binding, set } = makeBinding();
    startCloudSync("u1", binding, () => {});
    firestore.handler?.(snap({ items: [] }));

    set({ items: ["x"] });
    set({ items: ["x", "y"] });
    expect(firestore.setDoc).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);

    expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { items: ["x", "y"] });
  });

  it("mudança local pendente não é pisada por um snapshot antigo", () => {
    const { binding, set, read } = makeBinding();
    startCloudSync("u1", binding, () => {});
    firestore.handler?.(snap({ items: [] }));

    set({ items: ["novo"] });
    firestore.handler?.(snap({ items: [] })); // snapshot antigo chega antes do debounce

    expect(read()).toEqual({ items: ["novo"] });
  });

  it("flush grava na hora o que está esperando o debounce", async () => {
    const { binding, set } = makeBinding();
    const sync = startCloudSync("u1", binding, () => {});
    firestore.handler?.(snap({ items: [] }));

    set({ items: ["antes de sair"] });
    await sync.flush();

    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { items: ["antes de sair"] });
  });
});
