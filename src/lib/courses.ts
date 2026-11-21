import {
  Coffee,
  GraduationCap,
  HeartPulse,
  Laptop,
  Plane,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CurriculumUnit } from "@/lib/curriculum";
import { ACADEMICO_UNITS } from "@/lib/courses-academico";
import { FINANCAS_UNITS } from "@/lib/courses-financas";
import { SAUDE_UNITS } from "@/lib/courses-saude";
import { SOCIAL_UNITS } from "@/lib/courses-social";
import { TECNOLOGIA_UNITS } from "@/lib/courses-tecnologia";
import { VIAGEM_UNITS } from "@/lib/courses-viagem";
import { VIDA_COTIDIANA_UNITS } from "@/lib/courses-vida-cotidiana";

/**
 * CURSOS EXTRAS — trilhas paralelas à trilha profissional (A1–C1), do documento "Trilhas de
 * Conteúdo — Cursos Extras". Cada curso tem as suas unidades, o seu progresso e a sua ordem de
 * liberação; não mexem na trilha principal.
 *
 * Um curso com `units: []` aparece como "Em breve" e mostra as `planned` (o mapa das unidades
 * previstas). Para criar um curso novo, escreva as unidades (mesmo formato de `curriculum-a1.ts`).
 * Ids de unidade são únicos em todo o app (prefixo do curso) e estáveis: o progresso usa eles.
 */

export type PlannedUnit = { code: string; title: string; scenario: string };

export type CourseDef = {
  id: string;
  title: string;
  description: string;
  /** Faixa de níveis sugerida, como no PDF (ex.: "A1–A2"). */
  levels: string;
  /** 1 = lançar primeiro. */
  priority: 1 | 2 | 3;
  icon: LucideIcon;
  tone: string;
  units: CurriculumUnit[];
  planned: PlannedUnit[];
};

export const COURSE_DEFS: CourseDef[] = [
  {
    id: "vida-cotidiana",
    title: "Vida cotidiana essencial",
    description:
      "Compras, restaurante, direções, moradia e clima: o inglês de sobrevivência fora do trabalho.",
    levels: "A1–A2",
    priority: 1,
    icon: ShoppingBag,
    tone: "bg-mint",
    units: VIDA_COTIDIANA_UNITS,
    planned: [],
  },
  {
    id: "social",
    title: "Social informal / small talk",
    description:
      "Conversa fora do expediente: fim de semana, esportes, família, gírias e convites.",
    levels: "A2–B2",
    priority: 1,
    icon: Coffee,
    tone: "bg-sky",
    units: SOCIAL_UNITS,
    planned: [],
  },
  {
    id: "viagem",
    title: "Viagem a trabalho",
    description: "O inglês de deslocamento que ainda é profissional, mas fica fora do escritório.",
    levels: "B1–B2",
    priority: 2,
    icon: Plane,
    tone: "bg-butter",
    units: VIAGEM_UNITS,
    planned: [],
  },
  {
    id: "tecnologia",
    title: "Tecnologia e ferramentas digitais",
    description: "Vocabulário de Slack, vídeo, produto, segurança e IA no trabalho.",
    levels: "A2–B2",
    priority: 2,
    icon: Laptop,
    tone: "bg-lilac",
    units: TECNOLOGIA_UNITS,
    planned: [],
  },
  {
    id: "financas",
    title: "Finanças pessoais e números",
    description: "Números, banco, orçamento e conversa sobre dinheiro com naturalidade.",
    levels: "A2–B1",
    priority: 3,
    icon: Wallet,
    tone: "bg-peach",
    units: FINANCAS_UNITS,
    planned: [],
  },
  {
    id: "saude",
    title: "Saúde e emergências",
    description: "O mínimo para lidar com um imprevisto de saúde em inglês, com segurança.",
    levels: "A1–B1",
    priority: 3,
    icon: HeartPulse,
    tone: "bg-peach",
    units: SAUDE_UNITS,
    planned: [],
  },
  {
    id: "academico",
    title: "Acadêmico / certificações",
    description: "Vocabulário e estrutura formais para provas como TOEFL e IELTS.",
    levels: "B2–C1",
    priority: 3,
    icon: GraduationCap,
    tone: "bg-lilac",
    units: ACADEMICO_UNITS,
    planned: [],
  },
];
