import type { Album, ArtistCard, ArtistDetails, MusicProvider, ProviderCapabilities, Track } from "./types";
import { withTimeout } from "../core/concurrency";
import { withTrackCache, withQueryCache } from "./search-cache";

const SEARCH_TIMEOUT_MS = 15_000;

interface YtmApi {
  searchSongs(query: string): Promise<any[]>;
  searchArtists(query: string): Promise<any[]>;
  getArtistSongs(artistId: string): Promise<any[]>;
  getArtist(artistId: string): Promise<any>;
  searchAlbums(query: string): Promise<any[]>;
  getAlbum(albumId: string): Promise<any>;
}

type RawArtistRelease = {
  albumId?: unknown;
  name?: unknown;
  artist?: { artistId?: unknown; name?: unknown };
  thumbnails?: Array<{ url?: unknown }>;
  year?: unknown;
};

type RawArtistProfile = {
  artistId?: unknown;
  name?: unknown;
  topAlbums?: RawArtistRelease[];
  topSingles?: RawArtistRelease[];
};

function normalizeName(s: string): string {
  return s.normalize("NFKD").toLowerCase().trim();
}

function toTrack(song: any): Track {
  const videoId = song.videoId;
  return {
    uri: `ytm:${videoId}`,
    title: song.name,
    artist: song.artist?.name ?? "",
    album: song.album?.name ?? undefined,
    durationMs: song.duration != null ? song.duration * 1000 : undefined,
    artwork: song.thumbnails?.at(-1)?.url,
    deepLink: `https://music.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Maps releases from ArtistFull instead of ytmusic-api's getArtistAlbums().
 * The latter currently selects the first carousel on an artist page; that
 * carousel can be a generic YouTube Music recommendation shelf (for example,
 * "Podcasts"), not the artist's releases.
 */
export function mapArtistReleases(profile: RawArtistProfile, artistId: string, limit: number): Album[] {
  const releases = [
    ...(profile.topAlbums ?? []).map((item) => ({ item, releaseType: "album" as const })),
    ...(profile.topSingles ?? []).map((item) => ({ item, releaseType: "single" as const })),
  ];
  const seen = new Set<string>();

  return releases
    .filter(({ item }) => {
      const id = typeof item.albumId === "string" ? item.albumId : "";
      const ownerId = item.artist?.artistId;
      if (!id || ownerId !== artistId || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, Math.max(0, limit))
    .map(({ item, releaseType }) => {
      const albumId = item.albumId as string;
      const thumbnails = Array.isArray(item.thumbnails) ? item.thumbnails : [];
      const artwork = thumbnails.at(-1)?.url;
      return {
        uri: `ytm:album:${albumId}`,
        title: typeof item.name === "string" ? item.name : "",
        artist:
          typeof item.artist?.name === "string"
            ? item.artist.name
            : typeof profile.name === "string"
              ? profile.name
              : "",
        artwork: typeof artwork === "string" ? artwork : undefined,
        releaseType,
        ...(typeof item.year === "number" ? { year: item.year } : {}),
        deepLink: `https://music.youtube.com/browse/${albumId}`,
      };
    });
}

/**
 * Resolve-only YouTube Music backend (per design.md): search via ytmusic-api,
 * no local playback device on a VPS, so tracks carry a deep link instead of a
 * playable URL, and there is no createPlaylist/addTracksToPlaylist.
 */
export class YouTubeMusicBackend implements MusicProvider {
  readonly name = "youtube-music" as const;
  readonly capabilities: ProviderCapabilities = {
    remotePlaylists: false,
    remotePlayback: false,
  };

  private api: YtmApi | null = null;
  /** Init in progress, so a burst of cold requests shares one handshake. */
  private apiInit: Promise<YtmApi> | null = null;

  private async ensureApi(): Promise<YtmApi> {
    if (this.api) return this.api;
    // `initialize()` is a remote handshake: without this, every request that
    // arrives before the first one finishes builds its own client and repeats it.
    if (!this.apiInit) {
      this.apiInit = (async () => {
        const { default: YTMusic } = await import("ytmusic-api");
        const api = new YTMusic();
        await api.initialize();
        this.api = api as unknown as YtmApi;
        return this.api;
      })().finally(() => {
        this.apiInit = null;
      });
    }
    return this.apiInit;
  }

  async searchTrack(artist: string, title: string): Promise<Track | null> {
    return withTrackCache("youtube-music", artist, title, async () => {
      const api = await this.ensureApi();
      const songs = await withTimeout(api.searchSongs(`${artist} ${title}`), SEARCH_TIMEOUT_MS, [] as any[]);
      const want = normalizeName(artist);
      const match =
        songs.find((s) => {
          const got = normalizeName(s.artist?.name ?? "");
          return got === want || got.includes(want) || want.includes(got);
        }) ?? songs[0];
      return match ? toTrack(match) : null;
    });
  }

  async searchTracks(query: string, limit = 10): Promise<Track[]> {
    return withQueryCache("youtube-music", "tracks", query, limit, async () => {
      const api = await this.ensureApi();
      const songs = await withTimeout(api.searchSongs(query), SEARCH_TIMEOUT_MS, [] as any[]);
      return songs.slice(0, limit).map(toTrack);
    });
  }

  async searchArtist(name: string): Promise<{ id: string; name: string } | null> {
    return withQueryCache("youtube-music", "artist", name, 1, async () => {
      const api = await this.ensureApi();
      // ytmusic-api's axios client carries no timeout of its own, so without
      // this a stalled socket hangs /api/artist forever.
      const artists = await withTimeout(api.searchArtists(name), SEARCH_TIMEOUT_MS, [] as any[]);
      const item = artists[0];
      return item?.artistId ? { id: item.artistId, name: item.name } : null;
    });
  }

  async getArtistTopTracks(artistId: string, limit = 5): Promise<Track[]> {
    return withQueryCache("youtube-music", "artist-top", artistId, limit, async () => {
      const api = await this.ensureApi();
      const songs = await withTimeout(api.getArtistSongs(artistId), SEARCH_TIMEOUT_MS, [] as any[]);
      return songs.slice(0, limit).map(toTrack);
    });
  }

  /**
   * Only the artist avatar is available here: ytmusic-api's ArtistFull carries
   * no subscriber count and no bio, so `followers`/`description` stay undefined
   * on this backend and the artist screen simply omits those rows.
   */
  async getArtistDetails(artistId: string): Promise<ArtistDetails | null> {
    return withQueryCache("youtube-music", "artist-details", artistId, 1, async () => {
      const api = await this.ensureApi();
      const artist = await withTimeout(api.getArtist(artistId), SEARCH_TIMEOUT_MS, null as any);
      if (!artist?.artistId) return null;
      return {
        id: artist.artistId,
        name: artist.name ?? "",
        artwork: artist.thumbnails?.at(-1)?.url,
      };
    });
  }

  async searchArtists(query: string, limit = 5): Promise<ArtistCard[]> {
    return withQueryCache("youtube-music", "artists", query, limit, async () => {
      const api = await this.ensureApi();
      const artists = await withTimeout(api.searchArtists(query), SEARCH_TIMEOUT_MS, [] as any[]);
      return artists.slice(0, limit).map((a: any) => ({
        id: a.artistId,
        name: a.name,
        artwork: a.thumbnails?.at(-1)?.url,
      }));
    });
  }

  async getArtistAlbums(artistId: string, limit = 10): Promise<Album[]> {
    // Cached like the sibling artist lookups: /api/artist awaits releases in
    // the same Promise.all as topTracks and details.
    return withQueryCache("youtube-music", "artist-albums", artistId, limit, async () => {
      const api = await this.ensureApi();
      const artist = await withTimeout(api.getArtist(artistId), SEARCH_TIMEOUT_MS, null as RawArtistProfile | null);
      if (!artist?.artistId || artist.artistId !== artistId) return [];
      return mapArtistReleases(artist, artistId, limit);
    });
  }

  async searchAlbums(query: string, limit = 10): Promise<Album[]> {
    return withQueryCache("youtube-music", "albums", query, limit, async () => {
      const api = await this.ensureApi();
      const albums = await withTimeout(api.searchAlbums(query), SEARCH_TIMEOUT_MS, [] as any[]);
      return albums.slice(0, limit).map((a: any) => ({
        uri: `ytm:album:${a.albumId}`,
        title: a.name,
        artist: a.artist?.name ?? "",
        artwork: a.thumbnails?.at(-1)?.url,
        deepLink: `https://music.youtube.com/browse/MPREb_${a.albumId}`,
      }));
    });
  }

  async getAlbumTracks(albumId: string, limit = 30): Promise<Track[]> {
    // albumId is the opaque id returned verbatim by searchAlbums; reject
    // anything else to avoid path/SSRF manipulation of the API call.
    if (!/^[A-Za-z0-9_-]+$/.test(albumId)) throw new Error(`invalid albumId: ${albumId}`);
    return withQueryCache("youtube-music", "album-tracks", albumId, limit, async () => {
      const api = await this.ensureApi();
      const album = await withTimeout(api.getAlbum(albumId), SEARCH_TIMEOUT_MS, null as any);
      const songs = (album?.songs ?? []) as any[];
      return songs.slice(0, limit).map(toTrack);
    });
  }
}
