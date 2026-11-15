import type { Activity } from "@/lib/trail";

/** Distância vertical entre os nós e posição horizontal (%) de cada um — o zigue-zague. */
export const ROW_HEIGHT = 156;
/** Folga acima do 1º nó (a tag COMEÇAR sai um pouco pra cima do círculo). */
export const TOP_PAD = 16;
/** Do topo da linha ao centro do círculo (a caixa do nó tem 88px). */
export const NODE_CENTER_Y = 44;
const ZIGZAG_X = [28, 52, 72, 52];

export function nodeX(index: number, total: number, activity: Activity) {
  if (activity.skill === "checkpoint" || index === total - 1) return 50;
  return ZIGZAG_X[index % ZIGZAG_X.length] ?? 50;
}
