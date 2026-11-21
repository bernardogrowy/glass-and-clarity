/**
 * Avalia a fala de repetição ("Falar"): compara a transcrição com a frase-alvo.
 * É uma rubrica simples e tolerante (reconhecimento de voz erra com sotaque e ruído):
 * conta quantas palavras da frase-alvo aparecem na transcrição, sem ligar pra ordem,
 * maiúsculas, pontuação nem apóstrofos.
 */

/** Passa quando pelo menos esta fração das palavras da frase foi reconhecida. */
export const SPEECH_PASS_RATIO = 0.6;

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Fração (0–1) das palavras de `target` presentes em `transcript`; cada palavra falada vale uma vez. */
export function speechScore(target: string, transcript: string): number {
  const wanted = normalizeWords(target);
  if (wanted.length === 0) return 0;
  const heard = normalizeWords(transcript);
  let hits = 0;
  for (const word of wanted) {
    const at = heard.indexOf(word);
    if (at !== -1) {
      hits += 1;
      heard.splice(at, 1);
    }
  }
  return hits / wanted.length;
}

export function speechPassed(target: string, transcript: string): boolean {
  return speechScore(target, transcript) >= SPEECH_PASS_RATIO;
}
