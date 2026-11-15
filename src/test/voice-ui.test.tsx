import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceOrb, targetAmplitude } from "@/components/VoiceOrb";
import { canLiveCaption, joinCaptionParts, startLiveCaptions } from "@/lib/live-captions";

type Handler<T> = ((event: T) => void) | null;

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  started = false;
  onresult: Handler<{ results: { 0: { transcript: string } }[] }> = null;
  onerror: Handler<{ error?: string }> = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
    this.onend?.();
  }
  say(...parts: string[]) {
    this.onresult?.({ results: parts.map((transcript) => ({ 0: { transcript } })) });
  }
}

describe("legenda ao vivo", () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("detecta suporte do navegador", () => {
    expect(canLiveCaption()).toBe(true);
    vi.unstubAllGlobals();
    expect(canLiveCaption()).toBe(false);
    expect(startLiveCaptions(() => {})).toBeNull();
  });

  it("junta os pedaços de texto sem espaços sobrando", () => {
    expect(joinCaptionParts([" I go ", "", "to the beach "])).toBe("I go to the beach");
  });

  it("mostra o texto acumulado em inglês enquanto a pessoa fala", () => {
    const seen: string[] = [];
    startLiveCaptions((text) => seen.push(text));
    const rec = FakeRecognition.instances[0]!;
    expect(rec.lang).toBe("en-US");
    expect(rec.interimResults).toBe(true);
    expect(rec.continuous).toBe(true);

    rec.say("I go");
    rec.say("I go to the", "beach");
    expect(seen).toEqual(["I go", "I go to the beach"]);
  });

  it("se o navegador encerrar após uma pausa, reinicia e não perde o que já foi dito", () => {
    const seen: string[] = [];
    startLiveCaptions((text) => seen.push(text));
    FakeRecognition.instances[0]!.say("I went to the beach");
    // o Chrome encerra a sessão após silêncio
    FakeRecognition.instances[0]!.onend?.();

    expect(FakeRecognition.instances).toHaveLength(2);
    FakeRecognition.instances[1]!.say("with my friends");
    expect(seen.at(-1)).toBe("I went to the beach with my friends");
  });

  it("stop() encerra sem reiniciar", () => {
    const captions = startLiveCaptions(() => {})!;
    captions.stop();
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("permissão negada desliga a legenda sem reiniciar em laço", () => {
    startLiveCaptions(() => {});
    const rec = FakeRecognition.instances[0]!;
    rec.onerror?.({ error: "not-allowed" });
    rec.onend?.();
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("para de reiniciar se o serviço fecha logo ao abrir", () => {
    startLiveCaptions(() => {});
    for (let i = 0; i < 10; i++) FakeRecognition.instances.at(-1)!.onend?.();
    expect(FakeRecognition.instances.length).toBeLessThanOrEqual(4);
  });
});

describe("VoiceOrb", () => {
  it("o orbe reage ao volume ouvindo e se acalma parado", () => {
    const quiet = targetAmplitude("listen", 0, 0);
    const loud = targetAmplitude("listen", 1, 0);
    expect(loud).toBeGreaterThan(quiet + 0.3);
    expect(targetAmplitude("idle", 1, 0)).toBeLessThan(quiet + 0.05); // parado ignora o volume
    expect(targetAmplitude("speak", 0, 1.2)).toBeGreaterThan(targetAmplitude("idle", 0, 1.2));
  });

  it("renderiza o canvas escondido dos leitores de tela, sem quebrar sem contexto 2D", () => {
    const { container } = render(<VoiceOrb state="listen" getLevel={() => 0.5} size={120} />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.style.width).toBe("120px");
  });
});
