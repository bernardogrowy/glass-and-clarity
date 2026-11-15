/**
 * Gravação de voz no navegador para o modo voz do Hi.
 * Grava com MediaRecorder (webm/mp4, conforme o navegador) e converte para WAV mono 16 kHz,
 * formato que o Gemini aceita em qualquer navegador e que mantém o arquivo pequeno.
 */

/** Limite por fala: controla custo e tamanho da requisição. */
export const MAX_RECORDING_MS = 30_000;
export const WAV_SAMPLE_RATE = 16_000;

export type RecordingErrorCode = "unsupported" | "insecure" | "denied" | "no-microphone" | "empty";

export class RecordingError extends Error {
  readonly code: RecordingErrorCode;
  constructor(code: RecordingErrorCode) {
    super(code);
    this.name = "RecordingError";
    this.code = code;
  }
}

export function recordingErrorMessage(error: unknown): string | null {
  if (!(error instanceof RecordingError)) return null;
  switch (error.code) {
    case "insecure":
      return "O microfone só funciona em HTTPS ou em localhost. Abra o app pelo site publicado ou por localhost.";
    case "unsupported":
      return "Este navegador não permite gravar áudio. Tente o Chrome, Edge ou Safari atualizados.";
    case "denied":
      return "Permita o uso do microfone nas configurações do navegador para falar com o Hi.";
    case "no-microphone":
      return "Não encontrei nenhum microfone neste aparelho.";
    case "empty":
      return "Não ouvi nada. Toque no microfone, fale e toque de novo para enviar.";
  }
}

export function canRecordAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export type Recording = {
  /** Encerra a gravação e devolve o áudio no formato do navegador. */
  stop: () => Promise<Blob>;
  /** Descarta a gravação e libera o microfone. */
  cancel: () => void;
  /** Volume atual do microfone, de 0 a 1 (para animar o orbe). */
  level: () => number;
};

export async function startRecording(): Promise<Recording> {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    throw new RecordingError("insecure");
  }
  if (!canRecordAudio()) throw new RecordingError("unsupported");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "NotFoundError" || name === "OverconstrainedError") {
      throw new RecordingError("no-microphone");
    }
    throw new RecordingError("denied");
  }

  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  // Medidor de volume (só visual). Se o navegador não permitir, o orbe fica em 0.
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      audioContext = new AudioContextCtor();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
    }
  } catch {
    analyser = null;
  }
  const samples = new Uint8Array(analyser?.fftSize ?? 0);
  const level = () => {
    if (!analyser) return 0;
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const v of samples) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / samples.length) * 4);
  };

  const releaseMicrophone = () => {
    stream.getTracks().forEach((track) => track.stop());
    void audioContext?.close();
    audioContext = null;
    analyser = null;
  };
  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        if (recorder.state === "inactive") {
          releaseMicrophone();
          reject(new RecordingError("empty"));
          return;
        }
        recorder.addEventListener(
          "stop",
          () => {
            releaseMicrophone();
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            if (blob.size === 0) reject(new RecordingError("empty"));
            else resolve(blob);
          },
          { once: true },
        );
        recorder.stop();
      }),
    level,
    cancel: () => {
      chunks.length = 0;
      if (recorder.state !== "inactive") recorder.stop();
      releaseMicrophone();
    },
  };
}

/** WAV PCM 16 bits mono a partir de amostras float (-1..1). */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // bytes por amostra
  view.setUint16(34, 16, true); // bits por amostra
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Decodifica a gravação (webm/mp4/ogg…) e reamostra para WAV mono 16 kHz. */
export async function toWav16k(recording: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(await recording.arrayBuffer());
    const frames = Math.max(1, Math.ceil(decoded.duration * WAV_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, frames, WAV_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination); // mistura para mono e reamostra automaticamente
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), WAV_SAMPLE_RATE);
  } finally {
    void audioContext.close();
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
