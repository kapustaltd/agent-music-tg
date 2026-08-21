import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { HistoryEntry, SuggestionsResponse } from "./api";
import {
  EMPTY_SUGGESTIONS,
  PROMPT_EXAMPLES,
  PROMPT_EXAMPLE_COUNT,
  RECENT_MAX,
  buildPromptFeed,
  buildSearchFeed,
  isSearchFeedEmpty,
  loadRecentSearches,
  pushRecentSearch,
  samplePromptExamples,
} from "./suggestions";

function fakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

const realLocalStorage = globalThis.localStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: fakeLocalStorage(), configurable: true });
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: realLocalStorage, configurable: true });
});

function generation(id: number, trackCount: number): HistoryEntry {
  return {
    id,
    prompt: `запрос ${id}`,
    playlistName: `Плейлист ${id}`,
    trackCount,
    tracks: Array.from({ length: trackCount }, (_, i) => ({
      uri: `ytm:t${id}_${i}`,
      title: `T${i}`,
      artist: "A",
    })),
    createdAt: 1_700_000_000 + id,
  };
}

describe("recent searches", () => {
  test("round-trips a query and puts the newest first", () => {
    pushRecentSearch("инди");
    pushRecentSearch("джаз");
    expect(loadRecentSearches()).toEqual(["джаз", "инди"]);
  });

  test("moves a repeated query to the front instead of duplicating it", () => {
    pushRecentSearch("инди");
    pushRecentSearch("джаз");
    expect(pushRecentSearch("ИНДИ")).toEqual(["ИНДИ", "джаз"]);
  });

  test("ignores blank input and caps the list", () => {
    expect(pushRecentSearch("   ")).toEqual([]);
    for (let i = 0; i < RECENT_MAX + 4; i++) pushRecentSearch(`q${i}`);
    expect(loadRecentSearches()).toHaveLength(RECENT_MAX);
  });

  test("survives corrupted storage", () => {
    localStorage.setItem("miniapp-recent-searches", "{not json");
    expect(loadRecentSearches()).toEqual([]);
    localStorage.setItem("miniapp-recent-searches", JSON.stringify(["ok", 42, "", null]));
    expect(loadRecentSearches()).toEqual(["ok"]);
  });
});

describe("samplePromptExamples", () => {
  test("returns the fixed count of distinct ideas", () => {
    const picked = samplePromptExamples();
    expect(picked).toHaveLength(PROMPT_EXAMPLE_COUNT);
    expect(new Set(picked.map((p) => p.id)).size).toBe(PROMPT_EXAMPLE_COUNT);
  });

  test("always leads with the featured signature card", () => {
    const picked = samplePromptExamples();
    expect(picked[0]!.featured).toBe(true);
  });

  test("avoids repeating the non-featured ideas just shown", () => {
    const first = samplePromptExamples();
    const second = samplePromptExamples(first);
    const firstRest = new Set(first.slice(1).map((p) => p.id));
    expect(second.slice(1).some((e) => firstRest.has(e.id))).toBe(false);
  });

  test("puts at most two personalized prompts on the board", () => {
    // Deliberately artists that do NOT appear in PROMPT_EXAMPLES prompts, so a
    // generic example ("Что-нибудь похожее на Radiohead") cannot be mistaken
    // for a personalized one.
    const names = ["Motorama", "Сплин", "Kavinsky", "Nujabes"];
    const artists = names.map((name) => ({ name, artwork: null }));
    const expected = new Set(names.map((name) => `Что-нибудь похожее на ${name}`));
    const picked = samplePromptExamples([], artists);

    const personalized = picked.filter((p) => expected.has(p.prompt));
    expect(personalized).toHaveLength(2);
    expect(picked.slice(1).filter((p) => expected.has(p.prompt))).toHaveLength(2);
    // Each personalized card still carries its artist for the image layer.
    for (const idea of personalized) {
      expect(idea.artistImage).toBeNull();
      expect(idea.artist.length).toBeGreaterThan(0);
    }
  });

  test("still fills the board when every idea was already shown", () => {
    const picked = samplePromptExamples(PROMPT_EXAMPLES);
    expect(picked).toHaveLength(PROMPT_EXAMPLE_COUNT);
  });
});

describe("buildPromptFeed", () => {
  test("offers recent generations to resume, capped", () => {
    const data: SuggestionsResponse = {
      ...EMPTY_SUGGESTIONS,
      recentGenerations: [1, 2, 3, 4, 5, 6, 7, 8].map((id) => generation(id, 3)),
    };
    expect(buildPromptFeed(data, [], 6).resume).toHaveLength(6);
  });

  test("skips generations with no tracks, which cannot render a cover", () => {
    const data: SuggestionsResponse = {
      ...EMPTY_SUGGESTIONS,
      recentGenerations: [generation(1, 0), generation(2, 4)],
    };
    expect(buildPromptFeed(data, []).resume.map((g) => g.id)).toEqual([2]);
  });

  test("a new user gets no resume rail but keeps the ideas", () => {
    const feed = buildPromptFeed(EMPTY_SUGGESTIONS, [
      { id: "rainy-jazz", prompt: "Джаз для дождливого утра", artist: "Chet Baker", artistImage: null },
    ]);
    expect(feed.resume).toEqual([]);
    expect(feed.examples).toHaveLength(1);
  });

  test("offers genre chips only when there is neither a resume rail nor top artists", () => {
    const data: SuggestionsResponse = { ...EMPTY_SUGGESTIONS, genres: ["Поп", "Рок"] };
    expect(buildPromptFeed(data, []).genres).toEqual(["Поп", "Рок"]);
  });

  test("hides genre chips once there is a resume rail", () => {
    const data: SuggestionsResponse = {
      ...EMPTY_SUGGESTIONS,
      recentGenerations: [generation(1, 3)],
      genres: ["Поп", "Рок"],
    };
    expect(buildPromptFeed(data, []).genres).toEqual([]);
  });

  test("hides genre chips once there are top artists, and caps the artist list", () => {
    const data: SuggestionsResponse = {
      ...EMPTY_SUGGESTIONS,
      topArtists: Array.from({ length: 12 }, (_, i) => ({ name: `A${i}`, artwork: null })),
      genres: ["Поп", "Рок"],
    };
    const feed = buildPromptFeed(data, []);
    expect(feed.artists).toHaveLength(8);
    expect(feed.genres).toEqual([]);
  });
});

describe("buildSearchFeed", () => {
  const personal: SuggestionsResponse = {
    ...EMPTY_SUGGESTIONS,
    topArtists: [{ name: "Motorama", artwork: null }],
    libraryTracks: [{ uri: "ytm:a", title: "Alps", artist: "Motorama", artwork: null }],
    genres: ["Поп", "Рок"],
  };

  test("shows genre chips to a user with no library", () => {
    const feed = buildSearchFeed({ ...EMPTY_SUGGESTIONS, genres: ["Поп", "Рок"] }, []);
    expect(feed.genres).toEqual(["Поп", "Рок"]);
    expect(isSearchFeedEmpty(feed)).toBe(false);
  });

  test("hides genre chips once the user has their own music to show", () => {
    expect(buildSearchFeed(personal, []).genres).toEqual([]);
  });

  test("caps the personal sections", () => {
    const many: SuggestionsResponse = {
      ...EMPTY_SUGGESTIONS,
      topArtists: Array.from({ length: 12 }, (_, i) => ({ name: `A${i}`, artwork: null })),
      libraryTracks: Array.from({ length: 12 }, (_, i) => ({
        uri: `ytm:${i}`,
        title: `T${i}`,
        artist: "A",
        artwork: null,
      })),
    };
    const feed = buildSearchFeed(many, []);
    expect(feed.artists).toHaveLength(8);
    expect(feed.tracks).toHaveLength(6);
  });

  test("passes recent searches through untouched", () => {
    expect(buildSearchFeed(EMPTY_SUGGESTIONS, ["инди"]).recent).toEqual(["инди"]);
  });

  // The regression this guards: before, an empty `recent` rendered a blank panel.
  test("reports emptiness only when there is genuinely nothing to render", () => {
    expect(isSearchFeedEmpty(buildSearchFeed(EMPTY_SUGGESTIONS, []))).toBe(true);
    expect(isSearchFeedEmpty(buildSearchFeed(EMPTY_SUGGESTIONS, ["инди"]))).toBe(false);
  });
});
