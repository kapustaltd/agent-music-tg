import { useEffect, useRef, useState } from "react";
import { BookmarkSimple, CaretRight, CheckCircle, CircleNotch, DownloadSimple, ListPlus, MusicNotes, PencilSimple, Plus, ShareNetwork, WarningCircle } from "@phosphor-icons/react";
import { GlassPanel } from "../components/GlassPanel";
import { TrackRow } from "../components/TrackRow";
import { TrackOverflowMenu } from "../components/TrackOverflowMenu";
import { SaveTrackButton } from "../components/SaveTrackButton";
import { requestAddToPlaylist } from "../components/AddToPlaylistButton";
import { usePlayer } from "../lib/player";
import { api, type FinalizedPlaylist, type Track, type TrackVerificationStatus } from "../lib/api";
import { ARTWORK_ROW, artworkUrl } from "../lib/artwork";
import { useMyMusic } from "../lib/my-music";
import { shareUrlToChat } from "../lib/share";

type DownloadState = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

function trackCountLabel(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} треков`;
  if (mod10 === 1) return `${count} трек`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} трека`;
  return `${count} треков`;
}

export function ResultsScreen({
  playlist,
  generationId,
  initialSaved = false,
  onNewPrompt,
}: {
  playlist: FinalizedPlaylist;
  generationId: number;
  initialSaved?: boolean;
  onNewPrompt: () => void;
}) {
  const player = usePlayer();
  const [current, setCurrent] = useState<FinalizedPlaylist>(playlist);
  const [download, setDownload] = useState<DownloadState>({ kind: "idle" });
  const [trackDownloads, setTrackDownloads] = useState<Record<string, DownloadState>>({});
  // URIs already sent to the chat: after an extend, «Скачать» delivers only
  // the newly added tracks instead of re-sending the whole playlist.
  const downloadedUris = useRef<Set<string>>(new Set());
  const [saved, setSaved] = useState(initialSaved);
  const [saveBusy, setSaveBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playlist.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [verification, setVerification] = useState<Record<string, TrackVerificationStatus>>({});
  const { isSaved, toggleSaved } = useMyMusic();
  const polling = useRef(false);
  const done = useRef(false);

  const uris = current.tracks.map((t) => t.uri);
  const visibleTracks = current.tracks.filter((t) => verification[t.uri] !== "unavailable");
  const activeTrackIndex = player.track ? visibleTracks.findIndex((track) => track.uri === player.track?.uri) : -1;
  const sidebarTracks = visibleTracks.slice(activeTrackIndex >= 0 ? activeTrackIndex + 1 : 0, activeTrackIndex >= 0 ? activeTrackIndex + 4 : 3);
  const coverTracks = current.tracks.filter((track) => track.artwork).slice(0, 4);

  // The server resolves the URL in the background, while the browser starts
  // buffering the first likely choice. PlayerProvider keeps this one audio
  // element and adopts it on the tap, so the click usually only has to pass
  // through the already-open media connection.
  useEffect(() => {
    const first = visibleTracks[0] ?? current.tracks[0];
    if (!first) return;
    player.preload({
      uri: first.uri,
      title: first.title,
      artist: first.artist,
      artwork: first.artwork,
      durationMs: first.durationMs,
    });
    // Re-run only when the first candidate changes; player state changes must
    // not restart speculative network work for the same playlist.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTracks[0]?.uri, current.tracks[0]?.uri]);

  useEffect(() => {
    polling.current = true;
    done.current = false;
    let stopped = false;
    const MAX_POLLS = 45; // ~90s cap so a stuck "pending" track doesn't poll forever
    let attempts = 0;

    async function poll() {
      while (polling.current && !stopped && attempts < MAX_POLLS) {
        if (document.hidden) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        attempts += 1;
        try {
          const result = await api.verifyTracks(uris);
          if (stopped) return;
          setVerification(result);
          const allDone = uris.every((u) => {
            const s = result[u];
            return s === "verified" || s === "unavailable";
          });
          if (allDone) {
            polling.current = false;
            done.current = true;
            return;
          }
        } catch {
          // retry on next tick
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    poll();
    return () => { stopped = true; };
  }, [uris.join(",")]);

  function handleTrackClick(track: typeof current.tracks[0]) {
    player.toggle(
      { uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork },
      current.tracks.map((t) => ({ uri: t.uri, title: t.title, artist: t.artist, artwork: t.artwork })),
    );
  }

  function verificationIcon(uri: string) {
    const s = verification[uri];
    if (!s || s === "pending") return null;
    if (s === "checking") return <CircleNotch size={14} className="spin" style={{ color: "var(--text-muted)" }} />;
    if (s === "verified") return <CheckCircle size={14} weight="fill" style={{ color: "var(--accent)" }} />;
    return <WarningCircle size={14} weight="fill" style={{ color: "var(--danger)" }} />;
  }

  /** Publishing is idempotent server-side, so re-sharing reuses the same link. */
  async function handleShare() {
    setSharing(true);
    setShareError(null);
    try {
      const { url } = await api.createShare("generation", generationId);
      shareUrlToChat(url, current.name);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  async function handleDownload() {
    const fresh = current.tracks.filter((t) => !downloadedUris.current.has(t.uri));
    // Nothing new since the last send (no extend happened) — re-send everything.
    const toSend = fresh.length > 0 ? fresh : current.tracks;
    const name = fresh.length > 0 && fresh.length < current.tracks.length
      ? `${current.name} (добавленное)`
      : current.name;
    setDownload({ kind: "sending" });
    try {
      await api.download(name, toSend);
      for (const t of toSend) downloadedUris.current.add(t.uri);
      setDownload({ kind: "sent" });
      window.dispatchEvent(new CustomEvent("download-created"));
    } catch (e) {
      setDownload({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Merged action (screen-refinement D7): downloads the track to chat AND saves it to Favorites in one tap.
   *  The two effects surface separately though — this button's own icon/label
   *  track only the chat delivery; the heart next to it is what shows "saved". */
  async function handleTrackDownload(track: Track) {
    if (trackDownloads[track.uri]?.kind === "sending") return;
    setTrackDownloads((m) => ({ ...m, [track.uri]: { kind: "sending" } }));
    try {
      await Promise.all([
        api.download(`${track.title} — ${track.artist}`, [track]),
        isSaved(track.uri) ? Promise.resolve() : toggleSaved(track),
      ]);
      downloadedUris.current.add(track.uri);
      setTrackDownloads((m) => ({ ...m, [track.uri]: { kind: "sent" } }));
      window.dispatchEvent(new CustomEvent("download-created"));
    } catch (err) {
      setTrackDownloads((m) => ({
        ...m,
        [track.uri]: { kind: "error", message: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  async function handleRename() {
    const name = nameDraft.trim();
    if (name.length === 0 || name === current.name) {
      setNameDraft(current.name);
      setEditingName(false);
      return;
    }
    setRenameBusy(true);
    try {
      await api.renameGeneration(generationId, name);
      setCurrent((c) => ({ ...c, name }));
      setEditingName(false);
    } catch {
      setNameDraft(current.name);
    } finally {
      setRenameBusy(false);
    }
  }

  async function handleToggleSave() {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      if (saved) {
        await api.unsaveGeneration(generationId);
        setSaved(false);
      } else {
        await api.saveGeneration(generationId);
        setSaved(true);
      }
    } catch {
      // leave state unchanged on failure
    } finally {
      setSaveBusy(false);
    }
  }

  // --- Extend (add_to_playlist) -----------------------------------------
  const [extendPrompt, setExtendPrompt] = useState("");
  const [extendBusy, setExtendBusy] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  async function handleExtend() {
    const prompt = extendPrompt.trim();
    if (prompt.length === 0 || extendBusy) return;
    setExtendBusy(true);
    setExtendError(null);
    try {
      const outcome = await api.extendStream(generationId, prompt, () => {});
      if (outcome.status === "ok") {
        setCurrent(outcome.playlist);
        setExtendPrompt("");
        // New tracks arrived — make «Скачать» actionable again for the delta.
        setDownload({ kind: "idle" });
        window.dispatchEvent(new CustomEvent("balance-changed"));
      } else if (outcome.status === "error") {
        setExtendError(outcome.message);
      } else if (outcome.status === "needs_purchase") {
        setExtendError("Генерации закончились. Пополните баланс, чтобы добавить треки.");
      } else if (outcome.status === "rate_limited") {
        const t = new Date(outcome.retryAt * 1000);
        const hh = String(t.getHours()).padStart(2, "0");
        const mm = String(t.getMinutes()).padStart(2, "0");
        setExtendError(`Лимит генераций по подписке исчерпан. Снова доступно в ${hh}:${mm}.`);
      } else {
        setExtendError("Не удалось добавить треки. Попробуйте ещё раз.");
      }
    } catch (e) {
      setExtendError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtendBusy(false);
    }
  }

  return (
    <GlassPanel className="reveal results-panel">
      <div className="results-main">
      {editingName ? (
        <input
          className="playlist-name-input"
          aria-label="Название плейлиста"
          autoFocus
          value={nameDraft}
          disabled={renameBusy}
          maxLength={200}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => void handleRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleRename();
            } else if (e.key === "Escape") {
              setNameDraft(current.name);
              setEditingName(false);
            }
          }}
        />
      ) : (
        <h1 className="playlist-name-title">
          {current.name}
          <button
            type="button"
            className="playlist-name-edit-btn"
            aria-label={`Переименовать плейлист «${current.name}»`}
            onClick={() => { setNameDraft(current.name); setEditingName(true); }}
          >
            <PencilSimple size={16} weight="bold" className="playlist-name-edit-icon" />
          </button>
        </h1>
      )}
      {done.current && visibleTracks.length === 0 ? (
        <p className="text-muted mt-16">Все треки недоступны</p>
      ) : (
        <div className="stack mt-16 reveal-stagger">
          {visibleTracks.map((track, i) => (
          <TrackRow
            key={track.uri}
            style={{ ["--i" as string]: i }}
            onClick={() => handleTrackClick(track)}
            artwork={track.artwork}
            artworkBadge={verificationIcon(track.uri)}
            title={track.title}
            meta={track.artist}
            trailing={
              <>
                <SaveTrackButton track={track} />
                <TrackOverflowMenu
                  actions={[
                    {
                      key: "download",
                      label:
                        trackDownloads[track.uri]?.kind === "sending"
                          ? "Отправляем в чат…"
                          : trackDownloads[track.uri]?.kind === "sent"
                            ? "Отправить повторно"
                            : "Скачать в чат",
                      icon:
                        trackDownloads[track.uri]?.kind === "sending" ? (
                          <CircleNotch size={18} className="spin" />
                        ) : trackDownloads[track.uri]?.kind === "sent" ? (
                          <CheckCircle size={18} weight="fill" />
                        ) : (
                          <DownloadSimple size={18} />
                        ),
                      disabled: trackDownloads[track.uri]?.kind === "sending",
                      onClick: () => void handleTrackDownload(track),
                    },
                    {
                      key: "add-to-playlist",
                      label: "Добавить в плейлист",
                      icon: <ListPlus size={18} weight="bold" />,
                      onClick: () =>
                        requestAddToPlaylist({ uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork }),
                    },
                  ]}
                />
              </>
            }
          />
        ))}
        </div>
      )}
      </div>
      <div className="results-side">
      <div className="results-sidebar-summary" aria-label="Сводка плейлиста">
        <div className="results-sidebar-cover" aria-hidden="true">
          {coverTracks.length > 0 ? coverTracks.map((track) => (
            <img
              key={track.uri}
              src={artworkUrl(track.artwork, ARTWORK_ROW)}
              alt=""
              loading="lazy"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          )) : <MusicNotes className="results-sidebar-cover-fallback" size={24} weight="duotone" />}
        </div>
        <div className="results-sidebar-summary-copy">
          <p className="results-sidebar-kicker">Плейлист</p>
          <p className="results-sidebar-name">{current.name}</p>
          <p className="results-sidebar-meta">{trackCountLabel(visibleTracks.length || current.tracks.length)}</p>
        </div>
      </div>
      <div className="results-sidebar-divider" />
      {download.kind === "error" && (
        <div className="error-row mt-12">
          <span className="error-row-icon">
            <WarningCircle size={16} weight="bold" />
          </span>
          <p role="alert" className="error-row-message">
            {download.message}
          </p>
          <button className="glass-button" onClick={() => setDownload({ kind: "idle" })} style={{ padding: "6px 12px" }}>
            Повторить
          </button>
        </div>
      )}
      {shareError && (
        <div className="error-row mt-12">
          <span className="error-row-icon">
            <WarningCircle size={16} weight="bold" />
          </span>
          <p role="alert" className="error-row-message">
            {shareError}
          </p>
          <button className="glass-button" onClick={() => void handleShare()} style={{ padding: "6px 12px" }}>
            Повторить
          </button>
        </div>
      )}
      {extendError && (
        <div className="error-row mt-12">
          <span className="error-row-icon">
            <WarningCircle size={16} weight="bold" />
          </span>
          <p role="alert" className="error-row-message">
            {extendError}
          </p>
        </div>
      )}
      <div className="results-sidebar-actions-block">
        <p className="results-sidebar-label">Добавить треки</p>
        <div className="prompt-pill">
          <textarea
            className="prompt-pill-input"
            rows={1}
            value={extendPrompt}
            onChange={(e) => setExtendPrompt(e.target.value)}
            placeholder="Что добавить в плейлист?"
            aria-label="Что добавить в плейлист?"
            disabled={extendBusy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleExtend();
              }
            }}
          />
          <button
            type="button"
            className="prompt-submit"
            aria-label="Добавить треки в плейлист"
            disabled={extendBusy || extendPrompt.trim().length === 0}
            onClick={() => void handleExtend()}
          >
            {extendBusy ? <CircleNotch size={20} weight="bold" className="spin" /> : <Plus size={20} weight="bold" />}
          </button>
        </div>
      <div className="row results-actions">
        <button className="glass-button results-actions-label" onClick={onNewPrompt} title="Новый плейлист">
          <Plus size={18} />
          <span>Новый</span>
        </button>
        <button
          className="glass-button icon-only"
          onClick={() => void handleToggleSave()}
          disabled={saveBusy}
          aria-label={saved ? "Убрать из истории" : "Сохранить в историю"}
          title={saved ? "Убрать из истории" : "Сохранить в историю"}
        >
          {saveBusy ? <CircleNotch size={18} className="spin" /> : <BookmarkSimple size={18} weight={saved ? "fill" : "regular"} />}
        </button>
        <button
          className="glass-button icon-only"
          onClick={() => void handleShare()}
          disabled={sharing}
          aria-label="Поделиться плейлистом"
          title="Поделиться плейлистом"
        >
          {sharing ? <CircleNotch size={18} className="spin" /> : <ShareNetwork size={18} />}
        </button>
        <button
          className="glass-button primary icon-only"
          onClick={handleDownload}
          disabled={download.kind === "sending"}
          aria-label={
            download.kind === "sending"
              ? "Отправляю в чат…"
              : download.kind === "sent"
                ? "Отправлено в чат"
                : "Скачать"
          }
          title={
            download.kind === "sending"
              ? "Отправляю в чат…"
              : download.kind === "sent"
                ? "Отправлено в чат"
                : "Скачать"
          }
        >
          {download.kind === "sending" ? (
            <CircleNotch size={18} className="spin" />
          ) : download.kind === "sent" ? (
            <CheckCircle size={18} weight="fill" />
          ) : (
            <DownloadSimple size={18} />
          )}
        </button>
      </div>
      </div>
      <div className="results-sidebar-divider" />
      <section className="results-up-next" aria-label={activeTrackIndex >= 0 ? "Дальше в очереди" : "Треки в плейлисте"}>
        <div className="results-up-next-heading">
          <h2>{activeTrackIndex >= 0 ? "Дальше в очереди" : "В плейлисте"}</h2>
          <span>{sidebarTracks.length > 0 ? `ещё ${sidebarTracks.length}` : "готово"}</span>
        </div>
        {sidebarTracks.length > 0 ? (
          <div className="results-up-next-list">
            {sidebarTracks.map((track) => (
              <button
                key={track.uri}
                type="button"
                className="results-up-next-row"
                onClick={() => handleTrackClick(track)}
                aria-label={`Слушать ${track.title}`}
              >
                <span className="results-up-next-artwork" aria-hidden="true">
                  {track.artwork ? <img src={artworkUrl(track.artwork, ARTWORK_ROW)} alt="" loading="lazy" /> : <MusicNotes size={16} weight="duotone" />}
                </span>
                <span className="results-up-next-copy">
                  <span className="results-up-next-title">{track.title}</span>
                  <span className="results-up-next-meta">{track.artist}</span>
                </span>
                <CaretRight size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="results-up-next-empty">Нажмите на трек, чтобы начать очередь.</p>
        )}
      </section>
      </div>
    </GlassPanel>
  );
}
