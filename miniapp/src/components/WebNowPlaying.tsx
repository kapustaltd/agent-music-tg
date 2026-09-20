import { CircleNotch, HeartStraight, Pause, Play, Queue, SkipBack, SkipForward, WarningCircle } from "../icons";
import { useMyMusic } from "../lib/my-music";
import { ARTWORK_FULL, artworkUrl } from "../lib/artwork";
import { usePlayer, usePlayerTime } from "../lib/player";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The desktop-only companion to the compact player bar. */
export function WebNowPlaying({ onOpen }: { onOpen?: () => void }) {
  const player = usePlayer();
  const time = usePlayerTime();
  const { isSaved, isPending, toggleSaved } = useMyMusic();
  const track = player.track;

  if (!track) return null;

  const liked = isSaved(track.uri);
  const hasNext = player.queueIndex >= 0 && player.queueIndex < player.queue.length - 1;
  const nextTracks = player.queue.slice(player.queueIndex + 1, player.queueIndex + 4);
  const progress = Math.max(0, Math.min(1, time.progress || 0));
  const playControl =
    player.status === "loading" ? (
      <CircleNotch size={18} weight="bold" className="spin" />
    ) : player.status === "playing" ? (
      <Pause size={18} weight="fill" />
    ) : player.status === "error" ? (
      <WarningCircle size={18} weight="bold" />
    ) : (
      <Play size={18} weight="fill" />
    );

  return (
    <aside className="web-now-playing" aria-label="Сейчас играет">
      <div className="web-now-playing-header">
        <span className="web-now-playing-label">Сейчас играет</span>
        <button type="button" className="web-now-playing-queue" aria-label="Открыть очередь" title="Открыть очередь" onClick={onOpen}>
          <Queue size={17} weight="bold" />
        </button>
      </div>

      <button type="button" className="web-now-playing-artwork" aria-label="Открыть плеер" title="Открыть плеер" onClick={onOpen}>
        {track.artwork ? (
          <img src={artworkUrl(track.artwork, ARTWORK_FULL)} alt="" decoding="async" />
        ) : (
          <span aria-hidden="true">♪</span>
        )}
      </button>

      <div className="web-now-playing-meta">
        <div className="web-now-playing-title-row">
          <div className="web-now-playing-copy">
            <strong>{track.title}</strong>
            <span>{track.artist}</span>
          </div>
          <button
            type="button"
            className={`web-now-playing-like${liked ? " active" : ""}`}
            aria-label={liked ? "Убрать из моей музыки" : "Добавить в мою музыку"}
            title={liked ? "Убрать из моей музыки" : "Добавить в мою музыку"}
            aria-pressed={liked}
            disabled={isPending(track.uri)}
            onClick={() => void toggleSaved(track)}
          >
            <HeartStraight size={18} weight={liked ? "fill" : "regular"} />
          </button>
        </div>

        <div className="web-now-playing-progress" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="web-now-playing-time" aria-hidden="true">
          <span>{formatTime(time.currentTime)}</span>
          <span>{formatTime(time.duration)}</span>
        </div>
      </div>

      <div className="web-now-playing-controls">
        <button type="button" className="web-now-playing-next" aria-label="Предыдущий трек" disabled={player.queueIndex <= 0} onClick={() => player.previousTrack()}>
          <SkipBack size={22} weight="fill" />
        </button>
        <button
          type="button"
          className="web-now-playing-play"
          aria-label={player.status === "playing" ? `Пауза: ${track.title}` : `Слушать: ${track.title}`}
          title={player.status === "playing" ? "Пауза" : "Воспроизвести"}
          onClick={() => player.toggle(track)}
        >
          {playControl}
        </button>
        <button
          type="button"
          className="web-now-playing-next"
          aria-label="Следующий трек"
          title="Следующий трек"
          disabled={!hasNext}
          onClick={() => player.nextTrack()}
        >
          <SkipForward size={18} weight="fill" />
        </button>
      </div>

      <div className="web-now-playing-up-next">
        <div className="web-now-playing-section-title">Далее</div>
        {nextTracks.length > 0 ? (
          <div className="web-now-playing-queue-list">
            {nextTracks.map((nextTrack) => (
              <button
                type="button"
                className="web-now-playing-queue-item"
                title={`Слушать ${nextTrack.title}`}
                key={nextTrack.uri}
                onClick={() => player.toggle(nextTrack, player.queue)}
              >
                {nextTrack.artwork ? (
                  <img src={artworkUrl(nextTrack.artwork, 120)} alt="" loading="lazy" />
                ) : (
                  <span className="web-now-playing-queue-fallback" aria-hidden="true">♪</span>
                )}
                <span>
                  <strong>{nextTrack.title}</strong>
                  <small>{nextTrack.artist}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="web-now-playing-empty">Добавьте треки в очередь из поиска или плейлиста.</p>
        )}
      </div>
    </aside>
  );
}
