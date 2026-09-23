import { describe, expect, test } from "bun:test";
import type { AgentMessage, AgentProvider, AgentResult, ToolSpec } from "../agent/types";
import type { MusicProvider, RemotePlaylist, Track } from "../music/types";
import {
  ClarifyNeededError,
  DEFAULT_MAX_ITERATIONS,
  MaxIterationsExceededError,
  NoTracksResolvedError,
  NoNewTracksResolvedError,
  generatePlaylist,
} from "./generate-playlist";
import { mapWithConcurrency, withTimeout } from "./concurrency";

function fakeProvider(turns: AgentResult[]): AgentProvider & { calls: number } {
  const state = { calls: 0 };
  return {
    id: "fake",
    calls: 0,
    async generateMessages(_system: string, _messages: AgentMessage[], _tools: ToolSpec[]): Promise<AgentResult> {
      const turn = turns[state.calls] ?? turns.at(-1)!;
      state.calls++;
      this.calls = state.calls;
      return turn;
    },
  };
}

function fakeMusic(opts: { remotePlaylists: boolean; searchTrack?: (artist: string, title: string) => Promise<Track | null> }) {
  const searchTrackCalls: string[] = [];
  const searchTracksCalls: string[] = [];
  const music: MusicProvider & { searchTrackCalls: string[]; searchTracksCalls: string[] } = {
    name: "youtube-music",
    capabilities: { remotePlaylists: opts.remotePlaylists, remotePlayback: opts.remotePlaylists },
    searchTrackCalls,
    searchTracksCalls,
    async searchTrack(artist, title) {
      searchTrackCalls.push(`${artist}|${title}`);
      if (opts.searchTrack) return opts.searchTrack(artist, title);
      return { uri: `ytm:${artist}-${title}`, title, artist };
    },
    async searchTracks(query) {
      searchTracksCalls.push(query);
      return [{ uri: `ytm:q-${query}`, title: query, artist: "Q", artwork: `https://art/${query}.jpg` }];
    },
    async searchArtist(name) {
      return { id: `id-${name}`, name };
    },
    async getArtistTopTracks() {
      return [];
    },
    async searchArtists() {
      return [];
    },
    async getArtistAlbums() {
      return [];
    },
    async searchAlbums() {
      return [];
    },
    async getAlbumTracks() {
      return [];
    },
    ...(opts.remotePlaylists
      ? {
          async createPlaylist(name: string): Promise<RemotePlaylist> {
            return { id: "pl1", uri: "ytm:playlist:pl1", url: "https://music.youtube.com/playlist?list=pl1", name };
          },
          async addTracksToPlaylist() {},
        }
      : {}),
  };
  return music;
}

function finalizeResult(name: string, tracks: { artist: string; title: string }[]): AgentResult {
  return {
    text: "",
    toolCalls: [{ id: "call-final", name: "finalize_playlist", args: { name, tracks } }],
  };
}

function searchTracksResult(id: string, query: string): AgentResult {
  return {
    text: "",
    toolCalls: [{ id, name: "searchTracks", args: { query } }],
  };
}

function searchResult(id: string, artist: string, title: string): AgentResult {
  return {
    text: "",
    toolCalls: [{ id, name: "searchTrack", args: { artist, title } }],
  };
}

function addToPlaylistResult(id: string, tracks: { artist: string; title: string }[]): AgentResult {
  return {
    text: "",
    toolCalls: [{ id, name: "add_to_playlist", args: { tracks } }],
  };
}

describe("generatePlaylist", () => {
  test("hard-filters disliked uris from the finalized result", async () => {
    const provider = fakeProvider([
      finalizeResult("Test", [
        { artist: "Burial", title: "Archangel" },
        { artist: "Four Tet", title: "Baby" },
      ]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({
      provider,
      music,
      prompt: "test",
      dislikedUris: new Set(["ytm:Burial-Archangel"]),
    });
    expect(playlist.tracks.map((t) => t.uri)).toEqual(["ytm:Four Tet-Baby"]);
  });

  test("injects a capped dislike exclusion note into the initial prompt", async () => {
    let seenMessages: AgentMessage[] = [];
    const provider: AgentProvider = {
      id: "fake",
      async generateMessages(_system, messages) {
        seenMessages = messages;
        return finalizeResult("Test", [{ artist: "A", title: "One" }]);
      },
    };
    const music = fakeMusic({ remotePlaylists: false });
    await generatePlaylist({ provider, music, prompt: "test", dislikedTracks: ["Burial - Archangel"] });
    expect(seenMessages.some((m) => m.role === "user" && m.content.includes("Burial - Archangel"))).toBe(true);
  });

  test("onEvent emits structured tool_call/tool_result pairs with matching ids", async () => {
    const events: unknown[] = [];
    const provider = fakeProvider([
      searchResult("call-1", "Burial", "Archangel"),
      finalizeResult("Test", [{ artist: "Burial", title: "Archangel" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });

    await generatePlaylist({ provider, music, prompt: "test", onEvent: (e) => events.push(e) });

    const call = events.find((e) => (e as { kind: string }).kind === "tool_call") as
      | { kind: string; id: string; name: string; args: Record<string, unknown> }
      | undefined;
    const result = events.find((e) => (e as { kind: string }).kind === "tool_result") as
      | { kind: string; id: string; ok: boolean; result: unknown }
      | undefined;

    expect(call).toBeDefined();
    expect(call?.id).toBe("call-1");
    expect(call?.name).toBe("searchTrack");
    expect(call?.args).toEqual({ artist: "Burial", title: "Archangel" });

    expect(result).toBeDefined();
    expect(result?.id).toBe("call-1");
    expect(result?.ok).toBe(true);
  });

  test("marks provider-native reasoning as admin-only", async () => {
    const events: unknown[] = [];
    const provider = fakeProvider([
      {
        text: "",
        reasoning: "Проверяю настроение",
        toolCalls: [{ id: "call-final", name: "finalize_playlist", args: { name: "Test", tracks: [{ artist: "A", title: "One" }] } }],
      },
    ]);
    const music = fakeMusic({ remotePlaylists: false });

    await generatePlaylist({ provider, music, prompt: "test", onEvent: (e) => events.push(e) });

    expect(events).toContainEqual({ kind: "reasoning", delta: "Проверяю настроение", adminOnly: true });
  });

  test("finalizes against a playlist-capable backend (creates a real playlist)", async () => {
    const provider = fakeProvider([finalizeResult("Vibes", [{ artist: "A", title: "One" }])]);
    const music = fakeMusic({ remotePlaylists: true });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "chill vibes" });
    expect(playlist.name).toBe("Vibes");
    expect(playlist.tracks).toHaveLength(1);
    expect(playlist.remotePlaylistUrl).toBe("https://music.youtube.com/playlist?list=pl1");
  });

  test("finalizes against a resolve-only backend (no remote playlist created)", async () => {
    const provider = fakeProvider([finalizeResult("Vibes", [{ artist: "A", title: "One" }])]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "chill vibes" });
    expect(playlist.tracks).toHaveLength(1);
    expect(playlist.remotePlaylistUrl).toBeUndefined();
  });

  test("exceeds max iterations without finalize_playlist", async () => {
    const provider = fakeProvider([searchResult("c1", "A", "One")]);
    const music = fakeMusic({ remotePlaylists: true });
    await expect(generatePlaylist({ provider, music, prompt: "endless research", maxIterations: 3 })).rejects.toThrow(
      MaxIterationsExceededError,
    );
  });

  test("duplicate tool call is not re-dispatched against the backend", async () => {
    const provider = fakeProvider([
      searchResult("c1", "A", "One"),
      { text: "", toolCalls: [{ id: "c2", name: "searchTrack", args: { artist: "A", title: "One" } }] },
      finalizeResult("Vibes", [{ artist: "A", title: "One" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: true });
    await generatePlaylist({ provider, music, prompt: "repeat search" });
    // Called once for the first searchTrack turn; the duplicate call in turn 2 must
    // reuse the cached result, and turn 3's finalize resolve also reuses the cache.
    expect(music.searchTrackCalls).toEqual(["A|One"]);
  });

  test("identical search calls in one agent turn share one backend request", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [
        { id: "c1", name: "searchTrack", args: { artist: "A", title: "One" } },
        { id: "c2", name: "searchTrack", args: { title: "One", artist: "A" } },
      ] },
      finalizeResult("Vibes", [{ artist: "A", title: "One" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { messages } = await generatePlaylist({ provider, music, prompt: "test" });
    expect(music.searchTrackCalls).toEqual(["A|One"]);
    expect(messages.filter((m) => m.role === "tool").map((m) => m.callId)).toEqual(["c1", "c2"]);
  });

  test("a track already returned by searchTracks is not re-searched at finalize", async () => {
    // The fake searchTracks answers with artist "Q" and the query as the title,
    // which is exactly what the agent then finalizes — so the finalize resolve
    // must reuse that track rather than issuing a fresh per-track lookup.
    const provider = fakeProvider([
      searchTracksResult("c1", "dream pop"),
      finalizeResult("Vibes", [{ artist: "Q", title: "dream pop" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "dream pop" });
    expect(music.searchTrackCalls).toEqual([]);
    expect(playlist.tracks[0]?.uri).toBe("ytm:q-dream pop");
  });

  test("finalize still searches a track the backend never returned this run", async () => {
    const provider = fakeProvider([
      searchTracksResult("c1", "dream pop"),
      finalizeResult("Vibes", [{ artist: "Unseen", title: "Elsewhere" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    await generatePlaylist({ provider, music, prompt: "dream pop" });
    expect(music.searchTrackCalls).toEqual(["Unseen|Elsewhere"]);
  });

  test("knownTracks seeds the resolution index so stored tracks are never re-searched", async () => {
    const provider = fakeProvider([finalizeResult("Vibes", [{ artist: "Stored", title: "Track" }])]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({
      provider,
      music,
      prompt: "extend it",
      knownTracks: [{ uri: "ytm:stored-1", title: "Track", artist: "Stored" }],
    });
    expect(music.searchTrackCalls).toEqual([]);
    expect(playlist.tracks[0]?.uri).toBe("ytm:stored-1");
  });

  test("keeps the artwork of tracks the agent found through a search tool", async () => {
    // The tool results the model sees are stripped of artwork on purpose, and a
    // hit in the resolution index skips the searchTrack fallback — so the index
    // has to be fed the backend's own tracks or every cover is lost.
    const provider = fakeProvider([
      searchTracksResult("s1", "рэп-рок"),
      finalizeResult("Ураган", [{ artist: "Q", title: "рэп-рок" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "рэп-рок ураган" });
    expect(music.searchTrackCalls).toEqual([]);
    expect(playlist.tracks[0]).toMatchObject({
      uri: "ytm:q-рэп-рок",
      artwork: "https://art/рэп-рок.jpg",
    });
  });

  test("first clarify call surfaces as ClarifyNeededError with round 1", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [{ id: "c1", name: "clarify", args: { question: "Which mood?", options: ["a", "b", "c"] } }] },
    ]);
    const music = fakeMusic({ remotePlaylists: true });
    let caught: unknown;
    try {
      await generatePlaylist({ provider, music, prompt: "something" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ClarifyNeededError);
    expect((caught as ClarifyNeededError).round).toBe(1);
    expect((caught as ClarifyNeededError).messages.at(-1)).toMatchObject({ role: "tool", callId: "c1" });
  });

  test("clarify ignores simultaneous calls and resumes with a paired tool result", async () => {
    let resumedMessages: AgentMessage[] = [];
    let turn = 0;
    const provider: AgentProvider = {
      id: "fake",
      async generateMessages(_system, messages) {
        if (turn++ === 0) {
          return { text: "", toolCalls: [
            { id: "search", name: "searchTracks", args: { query: "unused" } },
            { id: "ask", name: "clarify", args: { question: "Какое настроение?", options: ["а", "б", "в"] } },
          ] };
        }
        resumedMessages = messages;
        return finalizeResult("Test", [{ artist: "A", title: "One" }]);
      },
    };
    const music = fakeMusic({ remotePlaylists: false });
    let clarify: ClarifyNeededError | null = null;
    try { await generatePlaylist({ provider, music, prompt: "музыка" }); }
    catch (e) { if (e instanceof ClarifyNeededError) clarify = e; else throw e; }
    expect(clarify).not.toBeNull();
    expect(music.searchTracksCalls).toEqual([]);
    expect(clarify!.messages.slice(-2)).toMatchObject([
      { role: "assistant", toolCalls: [{ id: "ask", name: "clarify" }] },
      { role: "tool", callId: "ask", name: "clarify" },
    ]);
    await generatePlaylist({ provider, music, prompt: "музыка", resumeMessages: clarify!.messages, resumeClarifyAnswer: "а", resumeClarifyRound: 1 });
    expect(resumedMessages.at(-1)).toEqual({ role: "user", content: "а" });
  });

  test("malformed clarification stays inside the agent loop", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [{ id: "bad", name: "clarify", args: { question: "Mood?", options: ["same", "same", ""] } }] },
      finalizeResult("Test", [{ artist: "A", title: "One" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist, messages } = await generatePlaylist({ provider, music, prompt: "music" });
    expect(playlist.tracks).toHaveLength(1);
    expect(messages).toContainEqual(expect.objectContaining({ role: "tool", callId: "bad", isError: true }));
  });

  test("extend keeps queued additions when a later turn asks for clarification", async () => {
    const firstProvider = fakeProvider([
      addToPlaylistResult("add", [{ artist: "B", title: "Two" }]),
      { text: "", toolCalls: [{ id: "ask", name: "clarify", args: { question: "Ещё?", options: ["а", "б", "в"] } }] },
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    let clarify: ClarifyNeededError | null = null;
    try {
      await generatePlaylist({ provider: firstProvider, music, prompt: "добавь", mode: "extend", baseTracks: [{ artist: "A", title: "One" }] });
    } catch (e) { if (e instanceof ClarifyNeededError) clarify = e; else throw e; }
    expect(clarify).not.toBeNull();
    const resumed = await generatePlaylist({
      provider: fakeProvider([finalizeResult("", [])]), music, prompt: "добавь", mode: "extend",
      baseTracks: [{ artist: "A", title: "One" }],
      resumeMessages: clarify!.messages, resumeClarifyAnswer: "а", resumeClarifyRound: clarify!.round,
    });
    expect(resumed.playlist.tracks.map((t) => t.uri)).toEqual(["ytm:A-One", "ytm:B-Two"]);
  });

  const resumeMessagesAfterOneClarify: AgentMessage[] = [
    { role: "user", content: "something" },
    { role: "assistant", content: "", toolCalls: [{ id: "c1", name: "clarify", args: { question: "Which mood?", options: ["a", "b", "c"] } }] },
  ];

  test("repairs a pending clarification session saved before tool results were paired", async () => {
    let seen: AgentMessage[] = [];
    const provider: AgentProvider = {
      id: "fake",
      async generateMessages(_system, messages) {
        seen = messages;
        return finalizeResult("Test", [{ artist: "A", title: "One" }]);
      },
    };
    await generatePlaylist({ provider, music: fakeMusic({ remotePlaylists: false }), prompt: "music",
      resumeMessages: [
        { role: "user", content: "music" },
        { role: "assistant", content: "", toolCalls: [
          { id: "unused", name: "searchTracks", args: { query: "music" } },
          { id: "ask", name: "clarify", args: { question: "Mood?", options: ["a", "b", "c"] } },
        ] },
      ],
      resumeClarifyAnswer: "a", resumeClarifyRound: 1,
    });
    expect(seen.slice(-3)).toMatchObject([
      { role: "assistant", toolCalls: [{ id: "ask" }] },
      { role: "tool", callId: "ask" },
      { role: "user", content: "a" },
    ]);
  });

  test("a second clarify call within the same run throws round 2, not rejected", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [{ id: "c2", name: "clarify", args: { question: "Which genre?", options: ["a", "b", "c"] } }] },
    ]);
    const music = fakeMusic({ remotePlaylists: true });
    let caught: unknown;
    try {
      await generatePlaylist({
        provider,
        music,
        prompt: "something",
        resumeMessages: resumeMessagesAfterOneClarify,
        resumeClarifyAnswer: "a",
        resumeClarifyRound: 1,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ClarifyNeededError);
    expect((caught as ClarifyNeededError).round).toBe(2);
  });

  test("a third clarify call within the same run throws round 3", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [{ id: "c3", name: "clarify", args: { question: "Which era?", options: ["a", "b", "c"] } }] },
    ]);
    const music = fakeMusic({ remotePlaylists: true });
    let caught: unknown;
    try {
      await generatePlaylist({
        provider,
        music,
        prompt: "something",
        resumeMessages: resumeMessagesAfterOneClarify,
        resumeClarifyAnswer: "a",
        resumeClarifyRound: 2,
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ClarifyNeededError);
    expect((caught as ClarifyNeededError).round).toBe(3);
  });

  test("a fourth clarify attempt past the cap is rejected, agent must finalize", async () => {
    const provider = fakeProvider([
      { text: "", toolCalls: [{ id: "c4", name: "clarify", args: { question: "Again?", options: ["a", "b", "c"] } }] },
      finalizeResult("Vibes", [{ artist: "A", title: "One" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: true });
    const { playlist } = await generatePlaylist({
      provider,
      music,
      prompt: "something",
      resumeMessages: resumeMessagesAfterOneClarify,
      resumeClarifyAnswer: "a",
      resumeClarifyRound: 3,
    });
    expect(playlist.name).toBe("Vibes");
  });

  test("default max iterations constant is sane", () => {
    expect(DEFAULT_MAX_ITERATIONS).toBe(4);
  });

  test("fails the run when the backend resolves zero tracks (no silent empty playlist)", async () => {
    const provider = fakeProvider([finalizeResult("Vibes", [{ artist: "A", title: "One" }, { artist: "B", title: "Two" }])]);
    const music = fakeMusic({ remotePlaylists: false, searchTrack: async () => null });
    await expect(generatePlaylist({ provider, music, prompt: "anything" })).rejects.toThrow(NoTracksResolvedError);
  });

  test("keeps partial playlist when only some tracks resolve", async () => {
    const provider = fakeProvider([finalizeResult("Vibes", [{ artist: "A", title: "One" }, { artist: "B", title: "Two" }])]);
    const music = fakeMusic({
      remotePlaylists: false,
      searchTrack: async (artist, title) => (artist === "A" ? { uri: "ytm:a", title, artist } : null),
    });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "anything" });
    expect(playlist.tracks).toHaveLength(1);
  });

  test("builds a playlist directly from a free-text searchTracks result (short named-work query)", async () => {
    const track = { artist: "Q", title: "kyokai no kanata soundtrack" };
    const provider = fakeProvider([searchTracksResult("c1", "kyokai no kanata soundtrack"), finalizeResult("OST", [track])]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "kyokai no kanata soundtrack" });
    expect(playlist.name).toBe("OST");
    expect(playlist.tracks).toHaveLength(1);
    expect(playlist.tracks[0]!.title).toBe("kyokai no kanata soundtrack");
  });

  test("candidate ranking adds no LLM turn or backend search", async () => {
    const provider = fakeProvider([
      searchTracksResult("c1", "shoegaze"),
      finalizeResult("Dream Wall", [{ artist: "Q", title: "shoegaze" }]),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    let rankCalls = 0;

    await generatePlaylist({
      provider,
      music,
      prompt: "шугейз",
      systemPrompt: "base\n\nLOCAL MUSIC CONTEXT: shoegaze",
      rankTracks(tracks) {
        rankCalls++;
        return tracks;
      },
    });

    expect(provider.calls).toBe(2);
    expect(music.searchTracksCalls).toEqual(["shoegaze"]);
    expect(rankCalls).toBe(1);
  });

  test("extend mode: add_to_playlist accumulates and finalize merges with the base, deduping base tracks", async () => {
    const baseTracks = [{ artist: "A", title: "One" }];
    // Agent tries to re-add a base track (A) and a new track (B); A must be ignored.
    const provider = fakeProvider([
      addToPlaylistResult("c1", [
        { artist: "B", title: "Two" },
        { artist: "A", title: "One" },
      ]),
      finalizeResult("", []),
    ]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({
      provider,
      music,
      prompt: "add more",
      mode: "extend",
      baseTracks,
      baseName: "Base",
    });
    expect(playlist.name).toBe("Base");
    expect(playlist.tracks.map((t) => `${t.artist}|${t.title}`).sort()).toEqual(["A|One", "B|Two"]);
  });

  test("extend mode: rejects a no-op when only the base resolves", async () => {
    const baseTracks = [{ artist: "A", title: "One" }];
    const provider = fakeProvider([
      addToPlaylistResult("c1", [{ artist: "Ghost", title: "Nowhere" }]),
      finalizeResult("", []),
    ]);
    const music = fakeMusic({ remotePlaylists: false, searchTrack: async (artist) => (artist === "A" ? { uri: "ytm:a", title: "One", artist: "A" } : null) });
    await expect(generatePlaylist({
      provider,
      music,
      prompt: "add a missing track",
      mode: "extend",
      baseTracks,
      baseName: "Base",
    })).rejects.toThrow(NoNewTracksResolvedError);
  });

  test("extend keeps an existing track even when it is now disliked", async () => {
    const provider = fakeProvider([finalizeResult("", [{ artist: "B", title: "Two" }])]);
    const music = fakeMusic({ remotePlaylists: false });
    const { playlist } = await generatePlaylist({
      provider, music, prompt: "add another", mode: "extend",
      baseTracks: [{ artist: "A", title: "One" }],
      knownTracks: [{ uri: "ytm:A-One", artist: "A", title: "One" }],
      dislikedUris: new Set(["ytm:A-One"]),
    });
    expect(playlist.tracks.map((t) => t.uri)).toEqual(["ytm:A-One", "ytm:B-Two"]);
  });

  test("final list keeps one copy when different entries resolve to the same URI", async () => {
    const provider = fakeProvider([finalizeResult("Test", [
      { artist: "A", title: "One" },
      { artist: "A", title: "One" },
      { artist: "Alias", title: "Same recording" },
    ])]);
    const music = fakeMusic({ remotePlaylists: false, searchTrack: async () => ({ uri: "ytm:one", title: "One", artist: "A" }) });
    const { playlist } = await generatePlaylist({ provider, music, prompt: "test" });
    expect(playlist.tracks.map((t) => t.uri)).toEqual(["ytm:one"]);
    expect(music.searchTrackCalls).toEqual(["A|One", "Alias|Same recording"]);
  });
});

describe("mapWithConcurrency", () => {
  test("preserves input order and respects the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    const out = await mapWithConcurrency(items, 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual(items.map((n) => n * 2));
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  test("propagates errors", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});

describe("withTimeout", () => {
  test("resolves fallback on timeout, value when fast", async () => {
    const slow = new Promise<string>((r) => setTimeout(() => r("late"), 100));
    expect(await withTimeout(slow, 10, "fallback")).toBe("fallback");
    expect(await withTimeout(Promise.resolve("fast"), 100, "fallback")).toBe("fast");
  });
});


test("missing or blank model title falls back to the original request", async () => {
  for (const name of ["", "   "]) {
    const provider = fakeProvider([finalizeResult(name, [{ artist: "A", title: "One" }])]);
    const { playlist } = await generatePlaylist({ provider, music: fakeMusic({ remotePlaylists: false }), prompt: "Ночной джаз" });
    expect(playlist.name).toBe("Ночной джаз");
  }
});

test("search previews arrive before finalization and exclude disliked tracks", async () => {
  const events: import("../agent/types").AgentEvent[] = [];
  const provider = fakeProvider([searchTracksResult("preview", "jazz"), finalizeResult("Jazz", [{ artist: "Q", title: "jazz" }])]);
  await generatePlaylist({ provider, music: fakeMusic({ remotePlaylists: false }), prompt: "jazz", onEvent: (event) => events.push(event) });
  const previewIndex = events.findIndex((event) => event.kind === "track_preview");
  const finalIndex = events.findIndex((event) => event.kind === "tool_call" && event.name === "finalize_playlist");
  expect(previewIndex).toBeGreaterThan(-1);
  expect(previewIndex).toBeLessThan(finalIndex);
  const excludedEvents: import("../agent/types").AgentEvent[] = [];
  await generatePlaylist({ provider: fakeProvider([searchTracksResult("preview", "jazz"), finalizeResult("Other", [{ artist: "A", title: "One" }])]), music: fakeMusic({ remotePlaylists: false }), prompt: "jazz", dislikedUris: new Set(["ytm:q-jazz"]), onEvent: (event) => excludedEvents.push(event) });
  expect(excludedEvents.some((event) => event.kind === "track_preview")).toBe(false);
});
