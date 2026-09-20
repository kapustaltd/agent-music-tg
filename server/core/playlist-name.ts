/** A bounded, plain-text title when the model omits one. Never alters manual names. */
export function playlistNameFromPrompt(prompt: string): string {
  const words = prompt.normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s/-]/gu, " ")
    .trim().split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word));
  const title = Array.from(words.slice(0, 5).join(" ")).slice(0, 64).join("").trim();
  return title || "Мой плейлист";
}
