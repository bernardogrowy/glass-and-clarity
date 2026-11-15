import { useEffect, useState } from "react";

/**
 * `false` no servidor e no primeiro render do cliente; vira `true` depois que a hidratação
 * terminou. Evita redirecionar com base em stores (localStorage) ainda não lidos.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
