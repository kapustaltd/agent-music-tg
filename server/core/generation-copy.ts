export const INVALID_PLAYLIST_REQUEST_MESSAGE =
  "Не понял запрос. Выбери настроение или опиши музыку своими словами.";

/**
 * Model-generated clarification text is not product copy. When a provider
 * narrates that an input is gibberish or a random collection of characters,
 * replace that explanation with the same concise recovery hint everywhere
 * the generation outcome is rendered (Mini App and bot).
 */
export function productClarifyMessage(question: string): string {
  const text = question.trim();
  if (
    /(?:random|gibberish|nonsense|unusable|meaningful|symbols?|characters?|не\s*понят|нечитаб|случайн\w*\s+(?:набор|последовательност)|набор\s+(?:символ|знак)|бессмыслен|мусор)/iu.test(
      text,
    )
  ) {
    return INVALID_PLAYLIST_REQUEST_MESSAGE;
  }
  return text || INVALID_PLAYLIST_REQUEST_MESSAGE;
}
