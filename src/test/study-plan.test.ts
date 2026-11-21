import { describe, expect, it } from "vitest";

import {
  addInboxItem,
  getInbox,
  markAllRead,
  snoozeSlot,
  unreadCount,
} from "@/lib/notifications-store";
import { computeDueNotifications } from "@/lib/smart-notifications";
import {
  buildMentorMessage,
  dayKey,
  describeBlockWhen,
  draftCommitment,
  emptyPlan,
  findMissedSlot,
  weekAdherence,
  type StudyPlan,
} from "@/lib/study-plan-store";

// Quarta-feira, 12/11/2025. O bloco de quarta é às 19:00.
const WED = (h: number, m = 0) => new Date(2025, 10, 12, h, m);
const THU = (h: number, m = 0) => new Date(2025, 10, 13, h, m);
const TUE = (h: number, m = 0) => new Date(2025, 10, 11, h, m);

// Terça já estudada: sem isso o bloco de terça (ontem) seria, corretamente, um bloco perdido.
const TUE_DONE = [dayKey(TUE(20))];

function plan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    ...emptyPlan(),
    signed: true,
    signedAt: new Date(2025, 10, 1).getTime(),
    goal: { kind: "prova", title: "TOEFL", target: "90 pontos", deadline: "2025-12-12" },
    focus: ["conversacao", "compreensao"],
    slots: [
      { id: "w2", weekday: 2, time: "19:00", minutes: 20 },
      { id: "w3", weekday: 3, time: "19:00", minutes: 30 },
    ],
    notifications: { enabled: true, leadMinutes: 10 },
    ...overrides,
  };
}

describe("contrato de estudo — mentor", () => {
  it("sem contrato assinado, convida a escrever o plano (sem cobrar nada)", () => {
    const msg = buildMentorMessage(emptyPlan(), [], WED(10));
    expect(msg.kind).toBe("convite");
  });

  it("cobra pelo objetivo: dias até a prova, meta e foco do bloco de hoje", () => {
    const msg = buildMentorMessage(plan(), TUE_DONE, WED(10));
    expect(msg.kind).toBe("hoje");
    expect(msg.body).toContain("Faltam 30 dias para TOEFL");
    expect(msg.body).toContain("90 pontos");
    expect(msg.title).toContain("19:00");
    expect(msg.title).toContain("compreensão auditiva"); // 2º bloco da semana → 2º foco
  });

  it("depois do horário e sem estudo, pergunta sobre o plano em vez de culpar", () => {
    const msg = buildMentorMessage(plan(), TUE_DONE, WED(23));
    expect(msg.kind).toBe("pergunta");
    expect(msg.missed?.slot.id).toBe("w3");
    expect(`${msg.title} ${msg.body}`).not.toMatch(/sequ[eê]ncia|streak|perdeu|falhou/i);
  });

  it("não considera perdido o bloco de hoje antes de 3h depois do horário", () => {
    expect(findMissedSlot(plan(), TUE_DONE, WED(20, 30))).toBeNull();
  });

  it("estudar em qualquer horário do dia cumpre o bloco daquele dia", () => {
    const msg = buildMentorMessage(plan(), [...TUE_DONE, dayKey(WED(8))], WED(23));
    expect(msg.kind).toBe("feito");
  });

  it("um bloco já respondido não volta a ser perguntado", () => {
    const answered = plan({
      checkins: [{ date: "2025-11-12", slotId: "w3", outcome: "imprevisto", at: 1 }],
    });
    expect(findMissedSlot(answered, TUE_DONE, WED(23))).toBeNull();
  });

  it("blocos anteriores à assinatura do contrato não contam como perdidos", () => {
    const fresh = plan({ signedAt: WED(22).getTime() });
    expect(findMissedSlot(fresh, [], WED(23))).toBeNull();
  });

  it("conta a aderência da semana pelos blocos do plano", () => {
    const week = weekAdherence(plan(), [dayKey(TUE(20))], WED(23));
    expect(week).toMatchObject({ planned: 2, done: 1 });
  });

  it("o rascunho do contrato cita objetivo, dias, horário e foco", () => {
    const text = draftCommitment(plan());
    expect(text).toContain("2x por semana");
    expect(text).toContain("terça, quarta");
    expect(text).toContain("TOEFL");
    expect(text).toContain("12/12/2025");
  });
});

describe("notificações inteligentes", () => {
  it("lembra 10 min antes do bloco, citando o objetivo, uma única vez", () => {
    const due = computeDueNotifications(plan(), TUE_DONE, WED(18, 52), new Set());
    expect(due).toHaveLength(1);
    expect(due[0]!.kind).toBe("lembrete");
    expect(due[0]!.body).toContain("TOEFL");

    const again = computeDueNotifications(plan(), TUE_DONE, WED(18, 53), new Set([due[0]!.id]));
    expect(again).toHaveLength(0);
  });

  it("não lembra cedo demais nem de quem já estudou hoje", () => {
    expect(computeDueNotifications(plan(), TUE_DONE, WED(17, 0), new Set())).toHaveLength(0);
    expect(
      computeDueNotifications(plan(), [...TUE_DONE, dayKey(WED(8))], WED(18, 55), new Set()),
    ).toHaveLength(0);
  });

  it("se o bloco não aconteceu, manda uma pergunta sobre o plano 90 min depois", () => {
    expect(computeDueNotifications(plan(), TUE_DONE, WED(20, 0), new Set())).toHaveLength(0);
    const due = computeDueNotifications(plan(), TUE_DONE, WED(20, 35), new Set());
    expect(due).toHaveLength(1);
    expect(due[0]!.kind).toBe("pergunta");
    expect(`${due[0]!.title} ${due[0]!.body}`).not.toMatch(/sequ[eê]ncia|streak|perdeu/i);
  });

  it("não notifica sem contrato assinado ou com notificações desligadas", () => {
    expect(computeDueNotifications(emptyPlan(), [], WED(18, 55), new Set())).toHaveLength(0);
    const off = plan({ notifications: { enabled: false, leadMinutes: 10 } });
    expect(computeDueNotifications(off, [], WED(18, 55), new Set())).toHaveLength(0);
  });
});

describe("atividade do foco do dia", () => {
  it("o mentor informa o foco do bloco e o botão leva à atividade certa", async () => {
    const { focusDestination } = await import("@/lib/study-plan-store");
    // Quarta é o 2º bloco da semana → 2º foco (compreensão) → conversa por voz.
    const msg = buildMentorMessage(plan(), TUE_DONE, WED(10));
    expect(msg.focus).toBe("compreensao");
    expect(focusDestination(msg.focus)).toBe("pratica");
    // Terça é o 1º bloco → 1º foco (conversação).
    expect(focusDestination("vocabulario")).toBe("licao");
    expect(focusDestination("gramatica")).toBe("licao");
    expect(focusDestination(null)).toBe("licao");
  });
});

describe("textos dos designs: lembrete, adiar e bloco perdido", () => {
  it("o lembrete diz quantos minutos faltam", () => {
    const [due] = computeDueNotifications(plan(), TUE_DONE, WED(18, 50), new Set());
    expect(due!.title).toBe("Sua missão começa em 10 min");
    expect(due!.body).toContain("Eu fico de olho.");
    expect(due!.focus).toBe("compreensao");
  });

  it("o card do mentor mostra o tempo que falta e respeita o adiamento", () => {
    const near = buildMentorMessage(plan(), TUE_DONE, WED(18, 50));
    expect(near.kind).toBe("hoje");
    expect(near.startsInMin).toBe(10);
    const snoozed = buildMentorMessage(plan(), TUE_DONE, WED(18, 50), { "2025-11-12:w3": 10 });
    expect(snoozed.startsInMin).toBe(20);
  });

  it("adiar 10 min empurra o lembrete e gera um novo no novo horário", () => {
    const snoozes = { "2025-11-12:w3": 10 };
    expect(computeDueNotifications(plan(), TUE_DONE, WED(18, 52), new Set(), snoozes)).toHaveLength(
      0,
    );
    const [due] = computeDueNotifications(plan(), TUE_DONE, WED(19, 3), new Set(), snoozes);
    expect(due!.id).toBe("lembrete:2025-11-12:w3:s10");
    expect(due!.title).toBe("Sua missão começa em 7 min");
  });

  it("a pergunta tem o formato do design e blocos de ontem entram só na caixa de entrada", () => {
    const [due] = computeDueNotifications(plan(), TUE_DONE, WED(20, 35), new Set());
    expect(due!.title).toBe("Bloco perdido: compreensão auditiva");
    expect(due!.body).toContain("Sem pressão — sua resposta só ajusta o plano.");
    expect(due!.push).toBe(true);

    const old = computeDueNotifications(plan(), TUE_DONE, THU(9), new Set());
    const yesterday = old.find((n) => n.id === "pergunta:2025-11-12:w3");
    expect(yesterday).toBeDefined();
    expect(yesterday!.push).toBe(false);
  });

  it("descreve o bloco como o mentor fala: hoje, ontem ou o dia da semana", () => {
    expect(describeBlockWhen("2025-11-12", "19:30", WED(21))).toBe("hoje, 19h30");
    expect(describeBlockWhen("2025-11-11", "18:00", WED(10))).toBe("ontem, 18h");
    expect(describeBlockWhen("2025-11-08", "09:00", WED(10))).toBe("sábado, 9h");
  });
});

describe("caixa de notificações", () => {
  const item = {
    id: "lembrete:2025-11-12:w3",
    kind: "lembrete" as const,
    title: "Sua missão começa em 10 min",
    body: "x",
    at: 1,
    slotId: "w3",
    date: "2025-11-12",
    time: "19:00",
    minutes: 30,
    focus: null,
  };

  it("não repete o mesmo aviso, conta não lidas e marca todas como lidas", () => {
    expect(addInboxItem(item)).toBe(true);
    expect(addInboxItem(item)).toBe(false);
    expect(unreadCount(getInbox().items)).toBe(1);
    markAllRead();
    expect(unreadCount(getInbox().items)).toBe(0);
  });

  it("acumula adiamentos do mesmo bloco", () => {
    snoozeSlot("2025-11-12", "w3", 10);
    snoozeSlot("2025-11-12", "w3", 10);
    expect(getInbox().snoozes["2025-11-12:w3"]).toBe(20);
  });
});
