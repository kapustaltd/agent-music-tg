import { useRef } from "react";
import { ArrowsClockwise, User } from "../icons";
import { GenerationStatus } from "../components/GenerationStatus";
import type { AgentProgressEvent, HistoryEntry, SuggestionsResponse } from "../lib/api";
import { buildPromptFeed } from "../lib/suggestions";
import { useScrollFade } from "../lib/useScrollFade";

/**
 * Up to four distinct covers from the playlist, as a small mosaic. Falls back
 * to fewer tiles when the playlist has fewer artworks, so a one-cover playlist
 * still renders a clean single tile rather than a gap-toothed grid.
 */
function coversOf(entry: HistoryEntry, max = 4): string[] {
  const seen = new Set<string>();
  for (const track of entry.tracks) {
    if (track.artwork) seen.add(track.artwork);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function trackCountLabel(entry: HistoryEntry): string {
  const n = entry.trackCount ?? entry.tracks.length;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} трек`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} трека`;
  return `${n} треков`;
}

export function AiMode({
  busy,
  progress,
  suggestions,
  examples,
  onRefreshExamples,
  onPickPrompt,
  onOpenGeneration,
  onOpenArtist,
}: {
  busy: boolean;
  progress: AgentProgressEvent[];
  suggestions: SuggestionsResponse;
  examples: string[];
  onRefreshExamples: () => void;
  onPickPrompt: (prompt: string) => void;
  onOpenGeneration: (entry: HistoryEntry) => void;
  onOpenArtist: (target: { id?: string; name?: string }) => void;
}) {
  const resumeRailRef = useRef<HTMLDivElement>(null);
  const suggestionsRailRef = useRef<HTMLDivElement>(null);
  const artistRailRef = useRef<HTMLDivElement>(null);
  useScrollFade(resumeRailRef);
  useScrollFade(suggestionsRailRef);
  useScrollFade(artistRailRef);

  if (busy) {
    return <GenerationStatus progress={progress} />;
  }

  const feed = buildPromptFeed(suggestions, examples);

  return (
    <>
      {feed.resume.length > 0 && (
        <section className="search-section">
          <h2 className="search-section-title">Продолжить слушать</h2>
          <div className="resume-rail" ref={resumeRailRef}>
            {feed.resume.map((entry) => {
              const covers = coversOf(entry);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="resume-card"
                  onClick={() => onOpenGeneration(entry)}
                  aria-label={`Открыть плейлист ${entry.playlistName ?? entry.prompt}`}
                >
                  <span className={`resume-cover resume-cover--${Math.min(covers.length, 4)}`} aria-hidden>
                    {covers.length > 0 ? (
                      covers.map((src) => <img key={src} src={src} alt="" />)
                    ) : (
                      <span className="resume-cover-blank" />
                    )}
                  </span>
                  <span className="resume-card-title">{entry.playlistName ?? entry.prompt}</span>
                  <span className="resume-card-meta">{trackCountLabel(entry)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="prompt-examples prompt-starters" aria-label="Примеры запросов">
        <div className="prompt-examples-head">
          <p className="prompt-examples-label">Идеи для запроса</p>
          <button
            type="button"
            className="prompt-examples-refresh"
            aria-label="Показать другие примеры"
            onClick={onRefreshExamples}
          >
            <ArrowsClockwise size={14} weight="bold" aria-hidden="true" />
            Ещё
          </button>
        </div>
        <div className="prompt-suggestions" aria-live="polite" ref={suggestionsRailRef}>
          {feed.examples.map((example) => (
            <button key={example} type="button" className="prompt-suggestion" onClick={() => onPickPrompt(example)}>
              {example}
            </button>
          ))}
        </div>
      </div>

      {feed.artists.length > 0 && (
        <section className="search-section">
          <h2 className="search-section-title">Исполнители</h2>
          <div className="search-artist-rail" ref={artistRailRef}>
            {feed.artists.map((artist) => (
              <button
                key={artist.name}
                type="button"
                className="search-artist-tile"
                aria-label={`Открыть исполнителя ${artist.name}`}
                onClick={() => onOpenArtist({ name: artist.name })}
              >
                <span className="search-artist-tile-avatar" aria-hidden>
                  {artist.artwork ? <img src={artist.artwork} alt="" /> : <User size={22} weight="bold" />}
                </span>
                <span className="search-artist-tile-name">{artist.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {feed.genres.length > 0 && (
        <div className="prompt-examples" aria-label="Жанры">
          <div className="prompt-examples-head">
            <p className="prompt-examples-label">Или по жанру</p>
          </div>
          <div className="prompt-suggestions">
            {feed.genres.map((genre) => (
              <button key={genre} type="button" className="prompt-suggestion" onClick={() => onPickPrompt(genre)}>
                {genre}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
