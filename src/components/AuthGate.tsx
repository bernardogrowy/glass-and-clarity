import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { CLOUD_BINDINGS } from "@/lib/cloud-bindings";
import { flushCloudSync, startCloudSync } from "@/lib/cloud-sync";
import { isFirebaseConfigured } from "@/lib/firebase";

const PUBLIC_PATHS = ["/login"];
/** Se a nuvem demorar mais que isso (rede ruim), segue com o que há no aparelho. */
const SYNC_TIMEOUT_MS = 8000;

/**
 * Protege o app e liga os stores ao Firestore:
 * - sem usuário logado → /login; logado em /login → /;
 * - só mostra o app depois que os dados da nuvem chegaram (evita, por exemplo, mandar para o
 *   onboarding quem já o concluiu em outro aparelho);
 * - se o Firebase ainda não foi configurado (.env.local vazio) não bloqueia nada.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const uid = auth.status === "signed-in" ? auth.user.uid : null;
  const [syncedUid, setSyncedUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (auth.status === "signed-out" && !isPublic) {
      navigate({ to: "/login", replace: true });
    } else if (auth.status === "signed-in" && isPublic) {
      navigate({ to: "/", replace: true });
    }
  }, [auth.status, isPublic, navigate]);

  useEffect(() => {
    if (!uid) return;
    let remaining = CLOUD_BINDINGS.length;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setSyncedUid(uid);
    };

    const syncs = CLOUD_BINDINGS.map((binding) =>
      startCloudSync(uid, binding, () => {
        remaining -= 1;
        if (remaining <= 0) finish();
      }),
    );
    const timeout = setTimeout(finish, SYNC_TIMEOUT_MS);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") void flushCloudSync();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      syncs.forEach((sync) => sync.stop());
    };
  }, [uid]);

  if (!isFirebaseConfigured) return <>{children}</>;

  const syncing = uid !== null && syncedUid !== uid;
  // Enquanto o Firebase responde (ou vai redirecionar) não mostra conteúdo privado.
  const blocked =
    auth.status === "loading" ||
    (auth.status === "signed-out" && !isPublic) ||
    (auth.status === "signed-in" && (isPublic || syncing));
  if (blocked) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return <>{children}</>;
}
