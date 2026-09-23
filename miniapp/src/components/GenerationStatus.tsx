import { TrackRow } from "./TrackRow";
import { usePlayer } from "../lib/player";
import { Swirl } from "loading-dev";
import type { AgentProgressEvent } from "../lib/api";

export function GenerationStatus({ progress, preview = false }: { progress: AgentProgressEvent[]; preview?: boolean }) {
  const player = usePlayer();
  const tracks = [...new Map(progress.flatMap((event) => event.tracks ?? []).map((track) => [track.uri, track])).values()].slice(0, 6);
  return (
    <section className="generation-preview" aria-label="Подбор музыки" aria-busy="true">
      <div className="generation-status" role="status" aria-label="Подбираю музыку">
        <Swirl size={48} />
      </div>
      {tracks.length > 0 && <div className="generation-tracks" aria-label="Уже найденные треки">
        {tracks.map((track) => <TrackRow key={track.uri} artwork={track.artwork} title={track.title} meta={track.artist} onClick={preview ? undefined : () => player.toggle(track, tracks)} />)}
      </div>}
    </section>
  );
}
