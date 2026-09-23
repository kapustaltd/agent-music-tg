import { TrackRow } from "./TrackRow";
import { usePlayer } from "../lib/player";
import { Swirl } from "loading-dev";
import { ThoughtLine } from "./ThoughtLine";
import type { AgentProgressEvent, AgentProgressPhase } from "../lib/api";

const STATUS_LABELS: Record<AgentProgressPhase, string> = {
  searching_tracks: "Ищу подходящие треки",
  searching_artist: "Сверяю исполнителей",
  found_tracks: "Проверяю найденные треки",
  found_artist: "Проверяю исполнителей",
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

export function GenerationStatus({ progress, preview = false }: { progress: AgentProgressEvent[]; preview?: boolean }) {
  const player = usePlayer();
  const tracks = [...new Map(progress.flatMap((event) => event.tracks ?? []).map((track) => [track.uri, track])).values()].slice(0, 6);
  const phases = progress.filter((event, index) => index === 0 || event.phase !== progress[index - 1]?.phase).map((event) => STATUS_LABELS[event.phase]);
  const steps = phases.length > 0 ? phases.slice(-4) : ["Ищу подходящие треки"];
  const detail = tracks.length > 0 ? foundLabel(tracks.length) : "Подбор начался";
  return (
    <section className="generation-preview" aria-label="Подбор музыки" aria-busy="true">
      <div className="generation-status" role="status" aria-live="polite" aria-atomic="true">
        <span className="generation-status-icon" aria-hidden="true"><Swirl size={20} /></span>
        <span className="generation-status-copy">
          <ThoughtLine steps={steps} />
          <span className="generation-status-detail">{detail}</span>
        </span>
      </div>
      {tracks.length > 0 && <div className="generation-tracks" aria-label="Уже найденные треки">
        {tracks.map((track) => <TrackRow key={track.uri} artwork={track.artwork} title={track.title} meta={track.artist} onClick={preview ? undefined : () => player.toggle(track, tracks)} />)}
      </div>}
    </section>
  );
}
