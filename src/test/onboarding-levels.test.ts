import { describe, expect, it } from "vitest";

import {
  DIFICULDADE_INFO,
  LEVEL_COPY,
  NIVEL_INFO,
  NIVEL_LIST,
  OBJETIVO_LABELS,
  adaptAnswersToLevel,
  emptyAnswers,
  levelCopy,
  nivelOpcaoFor,
} from "@/lib/onboarding-store";

describe("perguntas do onboarding adaptadas ao nível", () => {
  it("cada nível tem objetivos e dificuldades que existem, sem repetição", () => {
    for (const nivel of NIVEL_LIST) {
      const copy = LEVEL_COPY[nivel];
      expect(copy.objetivos.length, nivel).toBeGreaterThanOrEqual(5);
      expect(copy.dificuldades.length, nivel).toBeGreaterThanOrEqual(5);
      expect(new Set(copy.objetivos).size, nivel).toBe(copy.objetivos.length);
      expect(new Set(copy.dificuldades).size, nivel).toBe(copy.dificuldades.length);
      for (const o of copy.objetivos) expect(OBJETIVO_LABELS[o], `${nivel}:${o}`).toBeDefined();
      for (const d of copy.dificuldades) expect(DIFICULDADE_INFO[d], `${nivel}:${d}`).toBeDefined();
    }
  });

  it("o A1 e o C1 não recebem a mesma pergunta nem as mesmas opções", () => {
    const a1 = LEVEL_COPY.iniciante;
    const c1 = LEVEL_COPY.avancado;
    expect(a1.objetivoTitle).not.toBe(c1.objetivoTitle);
    expect(a1.dificuldadeTitle).not.toBe(c1.dificuldadeTitle);
    expect(a1.objetivos.filter((o) => c1.objetivos.includes(o))).toEqual([]);
    expect(a1.dificuldades).not.toEqual(c1.dificuldades);
  });

  it("usa a pergunta pedida em cada nível", () => {
    expect(LEVEL_COPY.iniciante.objetivoTitle).toBe("O que você quer aprender a falar primeiro?");
    expect(LEVEL_COPY["intermediario-avancado"].objetivoTitle).toBe(
      "O que você quer melhorar primeiro?",
    );
    expect(LEVEL_COPY.avancado.objetivoTitle).toBe("O que você gostaria de praticar?");
  });

  it("sem nível escolhido, usa o texto do intermediário", () => {
    expect(levelCopy(null)).toBe(LEVEL_COPY.intermediario);
  });

  it("todo objetivo novo (B2/C1) aparece em algum nível e tem rótulo", () => {
    const used = new Set(NIVEL_LIST.flatMap((n) => LEVEL_COPY[n].objetivos));
    for (const id of Object.keys(OBJETIVO_LABELS)) expect(used.has(id as never), id).toBe(true);
  });

  it("mudar o nível descarta o que não existe mais pra ele", () => {
    const answers = {
      ...emptyAnswers(),
      nivel: "avancado" as const,
      primeiroObjetivo: "sem-roteiro" as const,
      dificuldades: ["literal" as const, "vergonha" as const],
    };
    const down = adaptAnswersToLevel(answers, "iniciante");
    expect(down.nivel).toBe("iniciante");
    expect(down.primeiroObjetivo).toBeNull();
    expect(down.dificuldades).toEqual(["vergonha"]);

    // Resposta que continua valendo é mantida.
    const kept = adaptAnswersToLevel(
      { ...emptyAnswers(), primeiroObjetivo: "apresentar", dificuldades: ["vergonha"] },
      "basico",
    );
    expect(kept.primeiroObjetivo).toBe("apresentar");
    expect(kept.dificuldades).toEqual(["vergonha"]);
  });

  it("converte nível do perfil em opção do onboarding", () => {
    for (const nivel of NIVEL_LIST) expect(nivelOpcaoFor(NIVEL_INFO[nivel].level)).toBe(nivel);
    expect(nivelOpcaoFor("C2")).toBe("avancado");
  });

  it("o teste de nivelamento começa sem resultado", () => {
    expect(emptyAnswers().nivelTeste).toBeNull();
  });
});
