import { HeartStraight } from "../icons";
import { useMyMusic, type MyMusicTrack } from "../lib/my-music";

/** Saved-state shortcut; unsaved tracks expose saving in the overflow menu. */
export function SaveTrackButton({ track, className }: { track: MyMusicTrack; className?: string }) {
  const { isSaved, isPending, toggleSaved } = useMyMusic();
  const saved = isSaved(track.uri);
  const pending = isPending(track.uri);
  const label = saved ? "Убрать из моей музыки" : "Добавить в мою музыку";

  if (!saved) return null;

  return (
    <button
      type="button"
      className={["icon-btn", saved ? "active" : "", className].filter(Boolean).join(" ")}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        void toggleSaved(track);
      }}
    >
      <HeartStraight size={18} weight={saved ? "fill" : "bold"} />
    </button>
  );
}
