export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Fala o texto em voz alta. `onEnd` é chamado quando termina (ou se falhar/for cancelada). */
export function speak(text: string, lang = "en-US", rate = 1, onEnd?: () => void) {
  if (!canSpeak() || !text.trim()) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
