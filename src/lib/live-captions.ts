/**
 * Legenda ao vivo enquanto a pessoa fala (Web Speech API do navegador).
 * É só um retorno visual: a transcrição "oficial" da fala vem do Gemini, depois do envio.
 * Chrome/Edge/Safari suportam; Firefox não. Em Chrome o áudio da legenda é processado pelo
 * serviço de voz do navegador.
 */

type SpeechResultLike = { 0: { transcript: string } };
type SpeechEventLike = { results: ArrayLike<SpeechResultLike> };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canLiveCaption(): boolean {
  return getRecognitionCtor() !== null;
}

/** Junta pedaços de texto com um espaço, ignorando vazios. */
export function joinCaptionParts(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");
}

const FATAL_ERRORS = [
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported",
];
const MAX_QUICK_RESTARTS = 3;

/**
 * Começa a legendar. `onText` recebe o texto completo até agora (sempre o acumulado).
 * Devolve `null` se o navegador não suporta. Falhas da legenda nunca derrubam a gravação.
 */
export function startLiveCaptions(
  onText: (text: string) => void,
  lang = "en-US",
): { stop: () => void } | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  let active = true;
  let committed = ""; // texto de sessões de reconhecimento anteriores (o Chrome encerra após pausas)
  let quickRestarts = 0;
  let sessionStartedAt = 0;
  let recognition: RecognitionLike;

  const begin = () => {
    recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    let sessionText = "";

    recognition.onresult = (event) => {
      sessionText = joinCaptionParts(Array.from(event.results, (r) => r[0].transcript));
      onText(joinCaptionParts([committed, sessionText]));
    };
    recognition.onerror = (event) => {
      if (event.error && FATAL_ERRORS.includes(event.error)) active = false;
    };
    recognition.onend = () => {
      committed = joinCaptionParts([committed, sessionText]);
      if (!active) return;
      // Evita laço de reinícios se o serviço fecha logo ao abrir.
      quickRestarts = Date.now() - sessionStartedAt < 400 ? quickRestarts + 1 : 0;
      if (quickRestarts >= MAX_QUICK_RESTARTS) {
        active = false;
        return;
      }
      try {
        begin();
      } catch {
        active = false;
      }
    };

    sessionStartedAt = Date.now();
    recognition.start();
  };

  try {
    begin();
  } catch {
    return null;
  }

  return {
    stop: () => {
      active = false;
      try {
        recognition.stop();
      } catch {
        // já tinha parado
      }
    },
  };
}
