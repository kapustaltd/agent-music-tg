import { useEffect, useMemo, useRef, useState } from "react";
import { CircleNotch, WarningCircle, X } from "../icons";
import { api, type LyricsResult } from "../lib/api";
import { useDialog } from "../lib/useDialog";

/** Index of the last line whose timestamp has passed; -1 before the first line. */
function activeLineIndex(lines: { t: number }[], currentTime: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid]!.t <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

export function LyricsScreen({
  track,
  currentTime,
  duration,
  onSeek,
  onClose,
}: {
  track: { title: string; artist: string; artwork?: string };
  currentTime: number;
  /** Seconds; used to convert a tapped line's timestamp into a seek fraction. */
  duration: number;
  onSeek: (fraction: number) => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LyricsResult | "loading" | "error">("loading");
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useDialog<HTMLDivElement>(true, onClose);

  useEffect(() => {
    setResult("loading");
    api
      .lyrics(track.artist, track.title, duration || undefined)
      .then(setResult)
      .catch(() => setResult("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.artist, track.title]);

  const lines = result !== "loading" && result !== "error" && result.status === "synced" ? result.lines : null;
  const activeIndex = useMemo(() => (lines ? activeLineIndex(lines, currentTime) : -1), [lines, currentTime]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const body = bodyRef.current;
    const line = lineRefs.current[activeIndex];
    if (!body || !line) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lineTop = line.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    body.scrollTo({ top: Math.max(0, lineTop - body.clientHeight * 0.35), behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeIndex]);

  return (
    <div className="player-screen-overlay lyrics-screen-overlay">
      <div
        className="player-screen glass lyrics-screen"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Текст песни"
      >
        <div className="player-screen-header">
          <button type="button" className="action-btn action-btn--neutral" aria-label="Закрыть текст песни" title="Закрыть текст песни" onClick={onClose}>
            <X size={24} weight="bold" />
          </button>
          <div className="lyrics-screen-context">
            <strong>{track.title}</strong>
            <span>{track.artist}</span>
          </div>
        </div>

        <div className="lyrics-screen-body" ref={bodyRef}>
          {result === "loading" && (
            <p className="text-muted lyrics-screen-status">
              <CircleNotch size={18} className="spin" /> Ищу текст…
            </p>
          )}

          {(result === "error" || (result !== "loading" && result.status === "notFound")) && (
            <p className="text-muted lyrics-screen-status">
              <WarningCircle size={18} weight="bold" /> Текст песни не найден.
            </p>
          )}

          {result !== "loading" && result !== "error" && result.status === "plain" && (
            <p className="lyrics-screen-plain">{result.text}</p>
          )}

          {lines && (
            <ul className="lyrics-screen-lines">
              {lines.map((l, i) => (
                <li
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                >
                  <button
                    type="button"
                    className={`lyrics-screen-line ${i === activeIndex ? "active" : i < activeIndex ? "is-past" : "is-next"}${l.line ? "" : " is-instrumental"}`}
                    aria-current={i === activeIndex ? "true" : undefined}
                    aria-label={l.line ? `Перейти к строке: ${l.line}` : "Перейти к музыкальной паузе"}
                    onClick={() => onSeek(duration > 0 ? l.t / duration : 0)}
                  >
                    {l.line || <span className="sr-only">Инструментальная пауза</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
