import { TrackRow } from "./TrackRow";
import { usePlayer } from "../lib/player";
import { CircleNotch } from "../icons";
import type { AgentProgressEvent, AgentProgressPhase } from "../lib/api";

const STATUS_LABELS: Record<AgentProgressPhase, string> = {
  searching_tracks: "Ищу треки",
  searching_artist: "Ищу исполнителя",
  found_tracks: "Нашёл треки",
  found_artist: "Нашёл исполнителя",
  building_playlist: "Собираю плейлист",
  adding_tracks: "Добавляю треки",
  clarifying: "Уточняю запрос",
};

function foundLabel(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `Найдено ${count} треков`;
  if (mod10 === 1) return `Найден ${count} трек`;
  if (mod10 >= 2 && mod10 <= 4) return `Найдено ${count} трека`;
  return `Найдено ${count} треков`;
}

export function GenerationStatus({ progress, prompt }: { progress: AgentProgressEvent[]; prompt?: string }) {
  const player = usePlayer();
  const tracks = [...new Map(progress.flatMap((event) => event.tracks ?? []).map((track) => [track.uri, track])).values()].slice(0, 6);
  const latest = progress.at(-1);
  const label = latest ? STATUS_LABELS[latest.phase] : "Ищу подходящие треки";
  const resultLabel = foundLabel(tracks.length);

  return (
    <section className="generation-preview" aria-label="Подбор музыки">
      {prompt && <p className="generation-query">{prompt}</p>}
    <div className="generation-status" role="status" aria-live="polite" aria-atomic="true">
      <span className="generation-status-icon" aria-hidden="true">
        <CircleNotch size={17} weight="bold" className="spin" />
      </span>
      <span>{label}…</span>
    </div>
      {tracks.length > 0 && <div className="generation-tracks">
        <p className="text-muted fs-label">{resultLabel}</p>
        {tracks.map((track) => <TrackRow key={track.uri} artwork={track.artwork} title={track.title} meta={track.artist} onClick={() => player.toggle(track, tracks)} />)}
      </div>}
    </section>
  );
}
