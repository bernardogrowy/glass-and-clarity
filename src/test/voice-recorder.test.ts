import { describe, expect, it } from "vitest";
import {
  RecordingError,
  encodeWav,
  recordingErrorMessage,
  WAV_SAMPLE_RATE,
} from "@/lib/voice-recorder";

async function readWav(blob: Blob) {
  // O Blob do jsdom não tem arrayBuffer(); FileReader existe nos dois ambientes.
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const view = new DataView(buffer);
  const text = (offset: number, length: number) =>
    Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");
  return { view, text };
}

describe("encodeWav", () => {
  it("gera um WAV PCM 16 bits mono válido", async () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]), WAV_SAMPLE_RATE);
    expect(wav.type).toBe("audio/wav");
    expect(wav.size).toBe(44 + 5 * 2);

    const { view, text } = await readWav(wav);
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(text(12, 4)).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(text(36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(10);
    expect(view.getUint32(4, true)).toBe(36 + 10);
  });

  it("converte e limita as amostras", async () => {
    const { view } = await readWav(encodeWav(new Float32Array([0, 1, -1, 2, -3]), 16000));
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(50, true)).toBe(32767); // acima de 1 é cortado
    expect(view.getInt16(52, true)).toBe(-32768); // abaixo de -1 é cortado
  });
});

describe("recordingErrorMessage", () => {
  it("explica cada erro em português", () => {
    expect(recordingErrorMessage(new RecordingError("insecure"))).toMatch(/HTTPS ou em localhost/);
    expect(recordingErrorMessage(new RecordingError("denied"))).toMatch(/Permita/);
    expect(recordingErrorMessage(new RecordingError("no-microphone"))).toMatch(/microfone/);
    expect(recordingErrorMessage(new RecordingError("unsupported"))).toMatch(/navegador/);
    expect(recordingErrorMessage(new RecordingError("empty"))).toMatch(/Não ouvi/);
  });

  it("ignora erros que não são de gravação", () => {
    expect(recordingErrorMessage(new Error("outro"))).toBeNull();
  });
});
