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

export function GenerationStatus({ progress }: { progress: AgentProgressEvent[] }) {
  const latest = progress.at(-1);
  const label = latest ? STATUS_LABELS[latest.phase] : "Подбираю музыку";

  return (
    <div className="generation-status" role="status" aria-live="polite" aria-atomic="true">
      <span className="generation-status-icon" aria-hidden="true">
        <CircleNotch size={17} weight="bold" className="spin" />
      </span>
      <span>{label}…</span>
    </div>
  );
}
