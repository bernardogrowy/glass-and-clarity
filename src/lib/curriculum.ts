import type { LucideIcon } from "lucide-react";
import { A1_UNITS } from "@/lib/curriculum-a1";
import { A2_UNITS } from "@/lib/curriculum-a2";
import { B1_UNITS } from "@/lib/curriculum-b1";
import { B2_UNITS } from "@/lib/curriculum-b2";
import { C1_UNITS } from "@/lib/curriculum-c1";

/**
 * ESTRUTURA DA TRILHA — é este arquivo (e os `curriculum-*.ts` de cada nível) que define "o que
 * a pessoa aprende e em que ordem".
 *
 * Trilha → Seções (um nível CEFR cada) → Unidades → Itens. Cada unidade vira 5 atividades
 * (Entrada → Recordar → Aplicar → Falar → Checkpoint) com as lições prontas; veja `trail.ts`
 * para como isso é montado. Para mudar o conteúdo basta editar/adicionar itens nos arquivos de
 * nível:
 *
 * - Níveis: `curriculum-a1.ts` … `curriculum-c1.ts`; os construtores dos itens ficam em
 *   `curriculum-helpers.ts`.
 * - Cada item tem uma `stage`: `entrada` (vocabulário novo), `aplicar` (vira diálogo com
 *   lacuna) ou `falar` (frase repetida em voz alta). Recordar e Checkpoint só reciclam itens.
 * - `aplicar` exige `gap` (trecho do `example` que vira lacuna), `ask` (fala da Hi, sem repetir
 *   a lacuna) e `wrong` (2 opções erradas, sem repetir a lacuna).
 * - Não renomeie ids de unidade depois que houver usuários: o progresso salvo usa esses ids.
 */

export type ItemStage = "entrada" | "aplicar" | "falar";

type ItemBase = {
  /** Palavra ou expressão em inglês. */
  en: string;
  pt: string;
  /** Frase completa em inglês (usada no Recordar, no Aplicar e no Falar). */
  example: string;
  examplePt: string;
  /** Pronúncia, quando for uma palavra única. */
  ipa?: string;
  icon?: LucideIcon;
};

export type CurriculumItem =
  | (ItemBase & { stage: "entrada" | "falar" })
  | (ItemBase & {
      stage: "aplicar";
      /** Trecho de `example` que a pessoa completa no diálogo. */
      gap: string;
      /** Fala da Hi no diálogo (não pode conter a lacuna). */
      ask: { en: string; pt: string };
      /** Duas opções erradas (não podem repetir a lacuna). */
      wrong: [string, string];
    });

export type CurriculumUnit = {
  /** Estável: é a chave do progresso salvo. */
  id: string;
  /** Código do planejamento (A1.1, A1.2…). */
  code: string;
  title: string;
  description: string;
  /** Rótulo do cenário mostrado no "Complete a conversa". */
  context: string;
  /** Baralho onde os itens são salvos. Por padrão, o título da unidade. */
  deckName?: string;
  items: CurriculumItem[];
};

export type CurriculumSection = {
  id: string;
  title: string;
  /** Nível CEFR (A1, A2…): é ele que decide se a seção aparece para a pessoa. */
  level: string;
  /** Sem unidades = "Em breve". */
  units: CurriculumUnit[];
};

export type Curriculum = {
  name: string;
  sections: CurriculumSection[];
};

export const CURRICULUM: Curriculum = {
  name: "Inglês profissional",
  sections: [
    { id: "fundamentos", title: "Primeiro dia", level: "A1", units: A1_UNITS },
    { id: "rotina-de-equipe", title: "Rotina de equipe", level: "A2", units: A2_UNITS },
    {
      id: "autonomia",
      title: "Trabalhar em equipe com autonomia",
      level: "B1",
      units: B1_UNITS,
    },
    { id: "influenciar", title: "Influenciar e apresentar", level: "B2", units: B2_UNITS },
    // Uma seção com `units: []` aparece para a pessoa como "Em breve".
    { id: "lideranca", title: "Liderança e nuance", level: "C1", units: C1_UNITS },
  ],
};
