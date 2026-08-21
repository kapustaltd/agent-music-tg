import type { HistoryEntry, LibraryTrack, SuggestedArtist, SuggestionsResponse } from "./api";

/**
 * Selection logic for the create/search empty states.
 *
 * It lives here rather than in the screen components because the Mini App has
 * no DOM test setup — pure functions in `src/lib` are the only thing the suite
 * can cover, so anything with rules worth protecting belongs here.
 */

// --- Recent searches (localStorage) ----------------------------------------

const RECENT_KEY = "miniapp-recent-searches";
export const RECENT_MAX = 8;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q) return loadRecentSearches();
  const next = [q, ...loadRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the in-memory list still updates.
  }
  return next;
}

// --- Prompt ideas -----------------------------------------------------------

export const PROMPT_EXAMPLE_COUNT = 5;

/**
 * A starter card on the create screen: the prompt and the artist whose image
 * backs it. The mapping lives at the data level, not in the view: every card
 * knows its artist so the artwork layer can be a real background image (or a
 * gradient fallback when the image is missing).
 */
export interface PromptIdea {
  /** Stable key: a static slug for the generic bank, `artist:<name>` for
   *  personalized ideas built from the user's own top artists. */
  id: string;
  prompt: string;
  /** The artist whose artwork backs the card. */
  artist: string;
  /** Square artwork for the card background; `null` → gradient fallback. */
  artistImage: string | null;
  /** The signature card: always leads the board and spans full width. */
  featured?: boolean;
}

export const PROMPT_EXAMPLES: readonly PromptIdea[] = [
  {
    id: "indie-walk",
    prompt: "Спокойный инди для вечерней прогулки",
    artist: "Bonobo",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/ceb51b6de1f57f093cc569ec8127646d/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "focus-instrumental",
    prompt: "Фокус без вокала",
    artist: "Tycho",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/e42e76c1894ab347c8dcdfc3c3eccb51/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "workout",
    prompt: "Энергичная музыка для тренировки",
    artist: "Daft Punk",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/638e69b9caaf9f9f3f8826febea7b543/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "night-drive",
    prompt: "Неоновая электроника для ночной дороги",
    artist: "Kavinsky",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/3e080ec9d0825c855d38d08705c37bea/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "rainy-jazz",
    prompt: "Джаз для дождливого утра",
    artist: "Chet Baker",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/1db6e0b95901b33157683a092b3ab247/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "russian-road-trip",
    prompt: "Русский рок для поездки за город",
    artist: "Сплин",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/070d5e2b748ba5a6ed67d8560543cfdd/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "dinner-soul",
    prompt: "Тёплый соул для ужина вдвоём",
    artist: "Amy Winehouse",
    artistImage:
      "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/cf/3f/09/cf3f0994-980d-d8ed-088d-ae89af256b73/15UMGIM24224.rgb.jpg/600x600bb.jpg",
  },
  {
    id: "zeroes-party",
    prompt: "Танцевальные хиты нулевых",
    artist: "Gorillaz",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/ebbb1c133ed0220c714b9ed5d254561f/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "postpunk-walk",
    prompt: "Мрачный постпанк для ночной прогулки",
    artist: "Molchat Doma",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/1a2c0a157de5dcf5b675f12dc2047a13/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "space-soundtrack",
    prompt: "Музыка как саундтрек к космосу",
    artist: "Pink Floyd",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/d62a818a5de6455f17b6a992cf22b32f/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "reading-focus",
    prompt: "Лёгкий фон для чтения",
    artist: "Ólafur Arnalds",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/39c599372c3484a872a160243da08f09/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "cleaning-pop",
    prompt: "Бодрый поп для уборки",
    artist: "Pharrell Williams",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/1267b8781c5bff065a20dca4a3c9fda7/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "radiohead",
    prompt: "Что-нибудь похожее на Radiohead",
    artist: "Radiohead",
    featured: true,
    artistImage:
      "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/50/c7/dd50c790-99ac-d3d0-5ab8-e3891fb8fd52/634904032463.png/600x600bb.jpg",
  },
  {
    id: "dream-pop",
    prompt: "Женский вокал и дрим-поп",
    artist: "Beach House",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/bab7f5aedc71370b598262e065d3a0ef/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "classical-sleep",
    prompt: "Тихая классика перед сном",
    artist: "Ludovico Einaudi",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/5aa391abaca4189309ca0087a2fed4e2/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "latino-party",
    prompt: "Латино для домашней вечеринки",
    artist: "Bad Bunny",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/044a3f315b041864887a8dd8709e6926/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "disco-funk",
    prompt: "Диско и фанк для хорошего настроения",
    artist: "Earth, Wind & Fire",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/0be4c99a97b1073be467961c5d02acc6/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "chill-hiphop",
    prompt: "Хип-хоп с расслабленным битом",
    artist: "Nujabes",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/66061639b73edb7a01e8de7a1990eaa2/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "deadline-track",
    prompt: "Саундтрек для рабочего дедлайна",
    artist: "Hans Zimmer",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/1bd0b9f7a3cf12e01bdcc26fa69673f7/1000x1000-000000-80-0-0.jpg",
  },
  {
    id: "campfire-acoustic",
    prompt: "Акустика для вечера у костра",
    artist: "Ben Howard",
    artistImage: "https://cdn-images.dzcdn.net/images/artist/f0774cfaf37a7936a22d168ec2234878/1000x1000-000000-80-0-0.jpg",
  },
] as const;

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function personalizedIdea(artist: SuggestedArtist): PromptIdea {
  return {
    id: `artist:${artist.name.toLowerCase()}`,
    prompt: `Что-нибудь похожее на ${artist.name}`,
    artist: artist.name,
    artistImage: artist.artwork,
  };
}

const featuredIdea = (): PromptIdea => PROMPT_EXAMPLES.find((p) => p.featured)!;

/**
 * Picks a board of starter ideas, avoiding whatever was just on screen so the
 * "Ещё" button visibly changes something.
 *
 * The board always leads with the single featured idea (`featured` in the
 * bank): a stable signature card keeps "Можно начать так" recognizable, while
 * the four following slots reshuffle. `artists` seeds a couple of personalized
 * entries — the user's own top artists make far better starting points than
 * generic copy, and their real artwork backs the cards when available.
 */
export function samplePromptExamples(
  previous: readonly PromptIdea[] = [],
  artists: SuggestedArtist[] = [],
): PromptIdea[] {
  const previousIds = new Set(previous.map((p) => p.id));
  const personalized = shuffled(artists.map(personalizedIdea)).filter((p) => !previousIds.has(p.id));
  const generic = shuffled(PROMPT_EXAMPLES.filter((p) => !p.featured && !previousIds.has(p.id)));

  // At most two personalized slots: the board should still feel like a range
  // of ideas, not a list of the same few artists.
  const picked = [...personalized.slice(0, 2), ...generic];
  if (picked.length >= PROMPT_EXAMPLE_COUNT) return [featuredIdea(), ...picked.slice(0, PROMPT_EXAMPLE_COUNT - 1)];
  // Everything was excluded as "previous" — fall back to a plain reshuffle
  // rather than returning a short (or empty) board.
  return [featuredIdea(), ...shuffled(PROMPT_EXAMPLES.filter((p) => !p.featured)).slice(0, PROMPT_EXAMPLE_COUNT - 1)];
}

// --- Screen feeds -----------------------------------------------------------

export const EMPTY_SUGGESTIONS: SuggestionsResponse = {
  recentGenerations: [],
  topArtists: [],
  libraryTracks: [],
  genres: [],
};

export interface PromptFeed {
  /** Recent playlists to resume, newest first. Empty for a new user. */
  resume: HistoryEntry[];
  /** Starter ideas, personalized where possible. */
  examples: PromptIdea[];
  /** The user's own top artists, for a shortcut into their library. */
  artists: SuggestedArtist[];
  /** Shown only when there is nothing personal yet — see buildSearchFeed. */
  genres: string[];
}

/** Generations with no tracks cannot render a cover, so they are not offered. */
export function buildPromptFeed(data: SuggestionsResponse, examples: PromptIdea[], limit = 6): PromptFeed {
  const resume = data.recentGenerations.filter((g) => g.tracks.length > 0).slice(0, limit);
  const artists = data.topArtists.slice(0, 8);
  return {
    resume,
    examples,
    artists,
    genres: resume.length === 0 && artists.length === 0 ? data.genres : [],
  };
}

export interface SearchFeed {
  recent: string[];
  artists: SuggestedArtist[];
  tracks: LibraryTrack[];
  genres: string[];
}

/**
 * Search-mode empty state. Genres are shown only when the personal sections
 * cannot fill the screen on their own — for an established user they would just
 * be noise below their own library.
 */
export function buildSearchFeed(data: SuggestionsResponse, recent: string[]): SearchFeed {
  const artists = data.topArtists.slice(0, 8);
  const tracks = data.libraryTracks.slice(0, 6);
  const hasPersonal = artists.length > 0 || tracks.length > 0;
  return {
    recent,
    artists,
    tracks,
    genres: hasPersonal ? [] : data.genres,
  };
}

/** True when there is nothing at all to render below the input. */
export function isSearchFeedEmpty(feed: SearchFeed): boolean {
  return (
    feed.recent.length === 0 && feed.artists.length === 0 && feed.tracks.length === 0 && feed.genres.length === 0
  );
}
