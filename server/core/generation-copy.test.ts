import { describe, expect, test } from "bun:test";
import { INVALID_PLAYLIST_REQUEST_MESSAGE, productClarifyMessage } from "./generation-copy";

describe("productClarifyMessage", () => {
  test("replaces model narration about unusable input", () => {
    expect(productClarifyMessage("This looks like a random set of symbols. What music do you want?")).toBe(
      INVALID_PLAYLIST_REQUEST_MESSAGE,
    );
  });

  test("preserves a useful clarification question", () => {
    expect(productClarifyMessage("Какое настроение предпочитаете: спокойное или энергичное?")).toBe(
      "Какое настроение предпочитаете: спокойное или энергичное?",
    );
  });

  test("falls back when the provider sends an empty question", () => {
    expect(productClarifyMessage("   ")).toBe(INVALID_PLAYLIST_REQUEST_MESSAGE);
  });
});
