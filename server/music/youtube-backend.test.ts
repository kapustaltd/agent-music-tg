import { describe, expect, test } from "bun:test";
import { mapArtistReleases } from "./youtube-backend";

describe("mapArtistReleases", () => {
  test("keeps only releases owned by the requested artist", () => {
    const releases = mapArtistReleases(
      {
        artistId: "artist-1",
        name: "Мэйби Бэйби",
        topAlbums: [
          {
            albumId: "album-1",
            name: "МЭЙБИЛЭНД",
            artist: { artistId: "artist-1", name: "Мэйби Бэйби" },
            year: 2022,
            thumbnails: [{ url: "https://img/album.jpg" }],
          },
          {
            albumId: "podcast-1",
            name: "Soft Rock Ballads",
            artist: { artistId: "other", name: "Podcasts" },
          },
        ],
        topSingles: [
          {
            albumId: "single-1",
            name: "BABYBARS 4",
            artist: { artistId: "artist-1", name: "Мэйби Бэйби" },
            year: 2026,
          },
        ],
      },
      "artist-1",
      10,
    );

    expect(releases).toEqual([
      {
        uri: "ytm:album:album-1",
        title: "МЭЙБИЛЭНД",
        artist: "Мэйби Бэйби",
        artwork: "https://img/album.jpg",
        releaseType: "album",
        year: 2022,
        deepLink: "https://music.youtube.com/browse/album-1",
      },
      {
        uri: "ytm:album:single-1",
        title: "BABYBARS 4",
        artist: "Мэйби Бэйби",
        artwork: undefined,
        releaseType: "single",
        year: 2026,
        deepLink: "https://music.youtube.com/browse/single-1",
      },
    ]);
  });

  test("deduplicates a release that appears in both shelves", () => {
    const releases = mapArtistReleases(
      {
        topAlbums: [{ albumId: "same", name: "Same", artist: { artistId: "artist-1", name: "Artist" } }],
        topSingles: [{ albumId: "same", name: "Same", artist: { artistId: "artist-1", name: "Artist" } }],
      },
      "artist-1",
      10,
    );

    expect(releases).toHaveLength(1);
    expect(releases[0]?.releaseType).toBe("album");
  });
});
