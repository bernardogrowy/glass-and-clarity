import type { CurriculumItem } from "@/lib/curriculum";

/** Construtores dos itens de cada nível (`curriculum-a1.ts`, `curriculum-a2.ts`…). */

/** Vocabulário novo: palavra ou expressão, tradução, frase de exemplo e (opcional) pronúncia. */
export const entrada = (
  en: string,
  pt: string,
  example: string,
  examplePt: string,
  ipa?: string,
): CurriculumItem => ({ stage: "entrada", en, pt, example, examplePt, ipa });

/**
 * Vira diálogo com lacuna: `gap` é o trecho de `example` que a pessoa completa, `ask` a fala da
 * Hi (sem repetir a lacuna) e `wrong` as duas opções erradas.
 */
export const aplicar = (
  en: string,
  pt: string,
  example: string,
  examplePt: string,
  gap: string,
  ask: [string, string],
  wrong: [string, string],
): CurriculumItem => ({
  stage: "aplicar",
  en,
  pt,
  example,
  examplePt,
  gap,
  ask: { en: ask[0], pt: ask[1] },
  wrong,
});

/** Frase repetida em voz alta (o alvo é o `example`). */
export const falar = (
  en: string,
  pt: string,
  example: string,
  examplePt: string,
): CurriculumItem => ({ stage: "falar", en, pt, example, examplePt });
