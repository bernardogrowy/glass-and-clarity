import { toast } from "sonner";
import { saveWordToDeck, useFlashcardsStore } from "@/lib/flashcards-store";
import type { Lesson, LessonWord } from "@/lib/lessons";

/** Estado "palavra já está no baralho?" + ação de salvar, ligados ao baralho da lição. */
export function useSaveWord(lesson: Lesson, word: LessonWord) {
  const flashcards = useFlashcardsStore();
  const deck = flashcards.decks.find((d) => d.name === lesson.deckName);
  const saved =
    !!deck &&
    flashcards.cards.some(
      (c) => c.deckId === deck.id && c.front.toLowerCase() === word.en.toLowerCase(),
    );
  const save = () => {
    const result = saveWordToDeck(lesson.deckName, {
      front: word.en,
      back: word.pt,
      example: word.example,
    });
    toast.success(result.added ? `“${word.en}” salvo no baralho` : "Já está no baralho");
  };
  return { saved, save };
}

/** Palavra errada volta amanhã na revisão: cria/ajusta o card com vencimento em 1 dia. */
export function scheduleForTomorrow(lesson: Lesson, word: LessonWord) {
  saveWordToDeck(
    lesson.deckName,
    { front: word.en, back: word.pt, example: word.example },
    { dueInDays: 1 },
  );
}
