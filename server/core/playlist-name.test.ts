import { describe, expect, test } from "bun:test";
import { playlistNameFromPrompt } from "./playlist-name";

describe("playlist title fallback", () => {
  test.each([
    ["  Музыка   для\nвечерней прогулки ", "Музыка для вечерней прогулки"],
    ["English mood", "English mood"],
    ["grustnaya muzyka", "grustnaya muzyka"],
    ["Панк-рэп / DnB", "Панк-рэп DnB"],
    ["🎵 «НОЧНОЙ ДЖАЗ» #вечер", "НОЧНОЙ ДЖАЗ вечер"],
    ["", "Мой плейлист"],
    ["🎵 / ---", "Мой плейлист"],
    ["one two three four five six", "one two three four five"],
  ])("%s", (input, expected) => expect(playlistNameFromPrompt(input)).toBe(expected));
  test("bounds a long unbroken title without splitting Unicode code points", () => {
    expect(Array.from(playlistNameFromPrompt("Я".repeat(200)))).toHaveLength(64);
  });
});
