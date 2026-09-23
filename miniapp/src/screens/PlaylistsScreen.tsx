import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  MusicNotes, Trash, CircleNotch,
  Play, Pause, WarningCircle, ListPlus,
  ArrowsClockwise, CaretDown, CaretUp, DownloadSimple,
  Check, X, BookmarkSimple, ArrowLeft, PencilSimple, Playlist as PlaylistIcon, Sparkle,
  ShareNetwork,
} from "../icons";
import { EmptyState } from "../components/EmptyState";
import { TrackRow } from "../components/TrackRow";
import { TrackOverflowMenu } from "../components/TrackOverflowMenu";
import { requestAddToPlaylist } from "../components/AddToPlaylistButton";
import { usePlayer } from "../lib/player";
import { useMyMusic } from "../lib/my-music";
import { openStarsInvoice } from "../lib/telegram";
import { shareUrlToChat } from "../lib/share";
import { ARTWORK_ROW, artworkUrl } from "../lib/artwork";
import {
  api,
  PlaylistLimitReachedError,
  type SavedTrack,
  type DownloadRecord,
  type DownloadStatus,
  type HistoryEntry,
  type Playlist,
  type PlaylistDetail,
} from "../lib/api";

const DOWNLOAD_STATUS_LABEL: Record<DownloadStatus, string> = {
  pending: "в очереди",
  processing: "отправляется…",
  done: "готово",
  partial: "частично",
  failed: "ошибка",
};

function trackCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} трек`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} трека`;
  return `${count} треков`;
}

function DownloadEntry({
  record,
  onResend,
  onDelete,
  busy,
  style,
}: {
  record: DownloadRecord;
  onResend: () => void;
  onDelete: () => void;
  busy: "resend" | "delete" | null;
  style?: CSSProperties;
}) {
  const player = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const active = record.status === "pending" || record.status === "processing";
  const queue = record.tracks.map((rt) => ({ uri: rt.uri, title: rt.title, artist: rt.artist }));

  return (
    <li style={{ listStyle: "none" }}>
      <TrackRow
        style={style}
        ariaExpanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        fallbackIcon={<MusicNotes size={20} weight="bold" />}
        title={record.playlistName}
        metaClassName="search-row-meta"
        meta={
          <>
            Загрузка · {new Date(record.createdAt * 1000).toLocaleDateString("ru-RU")} · {trackCountLabel(record.tracks.length)} ·{" "}
            <span
              className={
                record.status === "failed"
                  ? "text-danger"
                  : record.status === "done"
                    ? "text-success"
                    : "text-warning"
              }
            >
              {DOWNLOAD_STATUS_LABEL[record.status]}
            </span>
          </>
        }
        trailing={
          <>
            {busy !== null && <CircleNotch size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
            <button
              type="button"
              className="icon-btn track-download-btn"
              aria-label={expanded ? "Свернуть" : "Показать треки"}
              title={expanded ? "Свернуть" : "Показать треки"}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {expanded ? <CaretUp size={18} /> : <CaretDown size={18} />}
            </button>
            <TrackOverflowMenu
              actions={[
                {
                  key: "resend",
                  label: "Скачать ещё раз",
                  icon: <ArrowsClockwise size={18} />,
                  disabled: busy !== null || active,
                  onClick: onResend,
                },
                {
                  key: "delete",
                  label: "Удалить из истории",
                  icon: <Trash size={18} />,
                  disabled: busy !== null,
                  destructive: true,
                  onClick: onDelete,
                },
              ]}
            />
          </>
        }
      />
      {expanded && (
        <ul className="download-entry-tracks">
          {record.tracks.map((t) => {
            const isActive = player.track?.uri === t.uri;
            const status = isActive ? player.status : "idle";
            return (
              <li key={t.uri}>
                <button
                  type="button"
                  className="download-track"
                  onClick={() => {
                    player.toggle({ uri: t.uri, title: t.title, artist: t.artist }, queue);
                  }}
                >
                  {status === "playing" ? (
                    <Pause size={14} weight="fill" style={{ flexShrink: 0, color: "var(--accent-text)" }} />
                  ) : (
                    <Play size={14} weight="fill" style={{ flexShrink: 0 }} />
                  )}
                  <span className="fs-label" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.artist} — {t.title}
                  </span>
                  {t.status === "failed" && (
                    <WarningCircle size={12} weight="bold" className="text-danger" aria-label={`Ошибка: ${t.error}`} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function HistoryItem({
  entry,
  onOpen,
  style,
}: {
  entry: HistoryEntry;
  onOpen: (entry: HistoryEntry) => void;
  style?: CSSProperties;
}) {
  const artwork = entry.tracks.find((t) => t.artwork)?.artwork;
  return (
    <li style={{ listStyle: "none" }}>
      <TrackRow
        style={style}
        onClick={() => onOpen(entry)}
        artwork={artwork}
        fallbackIcon={<BookmarkSimple size={20} weight="bold" />}
        title={entry.playlistName ?? entry.prompt}
        metaClassName="search-row-meta"
        meta={`Плейлист · ${new Date(entry.createdAt * 1000).toLocaleDateString("ru-RU")} · ${trackCountLabel(entry.trackCount ?? entry.tracks.length)}`}
      />
    </li>
  );
}

function PlaylistCover({ artworks }: { artworks: string[] }) {
  const covers = artworks.slice(0, 4);
  return (
    <span className="playlist-cover-art" aria-hidden="true">
      <PlaylistIcon className="playlist-cover-fallback" size={20} weight="bold" />
      {covers.length === 1 ? (
        <img src={artworkUrl(covers[0]!, ARTWORK_ROW)} alt="" loading="lazy" decoding="async"
          onError={(event) => { event.currentTarget.style.display = "none"; }} />
      ) : covers.length > 1 ? (
        Array.from({ length: 4 }, (_, i) => covers[i % covers.length]!).map((cover, i) => (
          <img key={`${cover}-${i}`} src={artworkUrl(cover, ARTWORK_ROW)} alt="" loading="lazy" decoding="async"
            onError={(event) => { event.currentTarget.style.display = "none"; }} />
        ))
      ) : null}
    </span>
  );
}

function LibrarySection({ onOpen }: { onOpen: (entry: HistoryEntry) => void }) {
  const [downloads, setDownloads] = useState<DownloadRecord[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [downloadsError, setDownloadsError] = useState(false);
  const [downloadsRetry, setDownloadsRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<{ id: number; kind: "resend" | "delete" } | null>(null);

  function loadHistory() {
    setHistoryError(false);
    setHistory(null);
    api.fetchHistory()
      .then((r) => setHistory(r.history))
      .catch(() => setHistoryError(true));
  }

  useEffect(loadHistory, []);

  useEffect(() => {
    const polling = { active: true };
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    async function fetchAndSchedule() {
      try {
        const r = await api.downloads();
        if (!polling.active) return;
        setDownloads(r.downloads);
        setDownloadsError(false);
        failures = 0;
        const hasActive = r.downloads.some((d) => d.status === "pending" || d.status === "processing");
        if (hasActive && polling.active) {
          timeoutId = setTimeout(fetchAndSchedule, 5000);
        }
      } catch {
        if (!polling.active) return;
        setDownloadsError(true);
        failures++;
        if (failures < 3) {
          timeoutId = setTimeout(fetchAndSchedule, 5000 * 2 ** (failures - 1));
        }
      }
    }

    fetchAndSchedule();

    return () => {
      polling.active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [downloadsRetry]);

  useEffect(() => {
    function onDownloadCreated() {
      api.downloads().then((r) => setDownloads(r.downloads)).catch(() => {});
    }
    window.addEventListener("download-created", onDownloadCreated);
    return () => window.removeEventListener("download-created", onDownloadCreated);
  }, []);

  async function handleResend(record: DownloadRecord) {
    setBusyId({ id: record.id, kind: "resend" });
    setError(null);
    setNotice(null);
    try {
      await api.resendDownload(record.id);
      setNotice(`«${record.playlistName}» отправляется в чат`);
      const r = await api.downloads();
      setDownloads(r.downloads);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(record: DownloadRecord) {
    setBusyId({ id: record.id, kind: "delete" });
    setError(null);
    const previous = downloads;
    setDownloads((list) => (list ?? []).filter((d) => d.id !== record.id));
    try {
      await api.deleteDownload(record.id);
    } catch (e) {
      setDownloads(previous);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {error && <p role="alert" className="icon-row"><WarningCircle size={16} weight="bold" /> {error}</p>}
      {notice && <p role="status" className="icon-row"><DownloadSimple size={16} /> {notice}</p>}
      <section className="library-section">
        <h2 className="screen-title">Сохранённые подборки</h2>
        {historyError ? (
          <div className="library-load-error" role="alert">
            <p>Не удалось загрузить сохранённые подборки.</p>
            <button type="button" className="glass-button" onClick={loadHistory}>Попробовать снова</button>
          </div>
        ) : history === null ? (
          <p role="status" className="text-muted">Загружаю…</p>
        ) : history.length ? <ul className="plain-list plain-list--col">
          {history.map((entry) => <HistoryItem key={entry.id} entry={entry} onOpen={onOpen} />)}
        </ul> : <p className="text-muted">Сохранённые плейлисты появятся здесь.</p>}
      </section>
      <section className="library-section">
        <h2 className="screen-title">Загрузки</h2>
        {downloadsError && downloads === null ? (
          <div className="library-load-error" role="alert">
            <p>Не удалось загрузить историю загрузок.</p>
            <button type="button" className="glass-button" onClick={() => { setDownloadsError(false); setDownloadsRetry((n) => n + 1); }}>Попробовать снова</button>
          </div>
        ) : downloads === null ? (
          <p role="status" className="text-muted">Загружаю…</p>
        ) : downloads.length ? <ul className="plain-list plain-list--col">
          {downloads.map((record) => <DownloadEntry key={record.id} record={record}
            busy={busyId?.id === record.id ? busyId.kind : null}
            onResend={() => handleResend(record)} onDelete={() => handleDelete(record)} />)}
        </ul> : <p className="text-muted">Здесь появятся треки, отправленные в чат.</p>}
        {downloadsError && downloads !== null && (
          <button type="button" className="glass-button" onClick={() => { setDownloadsError(false); setDownloadsRetry((n) => n + 1); }}>Обновить загрузки</button>
        )}
      </section>
    </>
  );
}

/** User playlists list: create (with slot limit + Stars purchase) and open a playlist's detail. */
function PlaylistsSection({ onOpen, onNewPrompt }: { onOpen: (id: number) => void; onNewPrompt: () => void }) {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [limitPrompt, setLimitPrompt] = useState<{ starsPrice: number } | null>(null);
  const [buyBusy, setBuyBusy] = useState(false);

  function load() {
    setLoadError(false);
    setPlaylists(null);
    api.playlists().then((r) => setPlaylists(r.playlists)).catch(() => setLoadError(true));
  }

  useEffect(load, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || createBusy) return;
    setCreateBusy(true);
    try {
      const { playlist } = await api.createPlaylist(name);
      setPlaylists((prev) => [playlist, ...(prev ?? [])]);
      setNewName("");
      setCreating(false);
    } catch (e) {
      if (e instanceof PlaylistLimitReachedError) setLimitPrompt({ starsPrice: e.starsPrice });
    } finally {
      setCreateBusy(false);
    }
  }

  async function buySlot() {
    setBuyBusy(true);
    try {
      const { payUrl } = await api.buyPlaylistSlots(1);
      openStarsInvoice(payUrl, (status) => {
        setBuyBusy(false);
        if (status === "paid") setLimitPrompt(null);
      });
    } catch {
      setBuyBusy(false);
    }
  }

  return (
    <section className="reveal library-section library-playlists">
      <div className="row library-section-head">
        <h1 className="screen-title">Плейлисты</h1>
        {!creating && (
          <button type="button" className="library-new-prompt" onClick={onNewPrompt}>
            <Sparkle size={18} weight="fill" /> Подобрать музыку
          </button>
        )}
      </div>

      {limitPrompt && (
        <div className="add-to-playlist-limit mt-12">
          <p className="text-muted fs-label">
            Лимит плейлистов исчерпан. Докупите слот за <strong>{limitPrompt.starsPrice}⭐</strong>.
          </p>
          <button type="button" className="glass-button primary" disabled={buyBusy} onClick={() => void buySlot()}>
            {buyBusy ? <CircleNotch size={16} className="spin" /> : <Sparkle size={16} weight="fill" />} Купить слот
          </button>
          <button type="button" className="glass-button" onClick={() => setLimitPrompt(null)}>Отмена</button>
        </div>
      )}

      {creating && (
        <div className="add-to-playlist-create-row mt-12">
          <input
            className="add-to-playlist-input"
            placeholder="Название плейлиста"
            aria-label="Название плейлиста"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <button type="button" className="icon-btn" aria-label="Создать" disabled={createBusy || newName.trim().length === 0} onClick={() => void handleCreate()}>
            {createBusy ? <CircleNotch size={18} className="spin" /> : <Check size={18} weight="bold" />}
          </button>
        </div>
      )}

      {loadError && (
        <div className="library-load-error" role="alert">
          <p>Не удалось загрузить плейлисты.</p>
          <button type="button" className="glass-button" onClick={load}>Попробовать снова</button>
        </div>
      )}

      {playlists === null && !loadError && (
        <p className="text-muted search-status mt-12">
          <CircleNotch size={16} className="spin" /> Загружаю…
        </p>
      )}

      {playlists !== null && playlists.length === 0 && !creating && (
        <EmptyState icon={<PlaylistIcon size={22} weight="bold" />} label="Пока нет плейлистов" />
      )}

      {playlists !== null && playlists.length > 0 && (
        <div className="stack reveal-stagger mt-12">
          {playlists.map((p, i) => (
            <button key={p.id} type="button" className="track-row search-artist-row" style={{ ["--i" as string]: i }} onClick={() => onOpen(p.id)}>
              <PlaylistCover artworks={p.coverArtworks ?? []} />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <p className="search-row-title">{p.name}</p>
                <p className="text-muted search-row-meta">Плейлист · {trackCountLabel(p.trackCount)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Playlist detail: Back to Музыка (8.1), rename/delete, track list with remove + play. */
function PlaylistDetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const player = usePlayer();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [trackDownloads, setTrackDownloads] = useState<Record<string, "sending" | "sent">>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  function loadPlaylist() {
    setLoadError(false);
    setPlaylist(null);
    api.playlist(id).then((r) => setPlaylist(r.playlist)).catch(() => setLoadError(true));
  }

  useEffect(loadPlaylist, [id]);

  useEffect(() => {
    const first = playlist?.tracks[0];
    if (!first) return;
    player.preload({ ...first, artwork: first.artwork ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist?.tracks[0]?.uri]);

  const queue = useMemo(
    () => (playlist?.tracks ?? []).map((t) => ({ uri: t.uri, title: t.title, artist: t.artist, artwork: t.artwork ?? undefined })),
    [playlist],
  );

  async function handleRename() {
    const name = nameDraft.trim();
    if (!playlist || !name || name === playlist.name) {
      setRenaming(false);
      return;
    }
    await api.renamePlaylist(id, name).catch(() => {});
    setPlaylist((p) => (p ? { ...p, name } : p));
    setRenaming(false);
  }

  async function handleDelete() {
    await api.deletePlaylist(id).catch(() => {});
    onBack();
  }

  async function handleRemoveTrack(uri: string) {
    setRemoving((m) => ({ ...m, [uri]: true }));
    try {
      await api.removeTrackFromPlaylist(id, uri);
      setPlaylist((p) => (p ? { ...p, tracks: p.tracks.filter((t) => t.uri !== uri) } : p));
    } finally {
      setRemoving((m) => ({ ...m, [uri]: false }));
    }
  }

  async function handleDownloadAll() {
    if (!playlist || playlist.tracks.length === 0 || downloadingAll) return;
    setDownloadingAll(true);
    try {
      await api.download(
        playlist.name,
        playlist.tracks.map((t) => ({ uri: t.uri, title: t.title, artist: t.artist, artwork: t.artwork ?? undefined })),
      );
      window.dispatchEvent(new CustomEvent("download-created"));
    } finally {
      setDownloadingAll(false);
    }
  }

  /** Publishing is idempotent server-side, so re-sharing reuses the same link. */
  async function handleShare() {
    if (!playlist || playlist.tracks.length === 0 || sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      const { url } = await api.createShare("playlist", id);
      shareUrlToChat(url, playlist.name);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  async function handleTrackDownload(track: PlaylistDetail["tracks"][number]) {
    if (trackDownloads[track.uri] === "sending") return;
    setTrackDownloads((m) => ({ ...m, [track.uri]: "sending" }));
    try {
      await api.download(`${track.title} — ${track.artist}`, [
        { uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork ?? undefined },
      ]);
      setTrackDownloads((m) => ({ ...m, [track.uri]: "sent" }));
      window.dispatchEvent(new CustomEvent("download-created"));
    } catch {
      setTrackDownloads((m) => {
        const next = { ...m };
        delete next[track.uri];
        return next;
      });
    }
  }

  return (
    <section className="reveal library-section playlist-detail">
      <div className="row library-section-head">
        <button type="button" className="action-btn action-btn--neutral" aria-label="Назад к Музыке" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        {playlist && !confirmDelete && (
          <div className="row library-detail-actions">
            {playlist.tracks.length > 0 && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Поделиться плейлистом"
                title="Поделиться плейлистом"
                disabled={sharing}
                onClick={() => void handleShare()}
              >
                {sharing ? <CircleNotch size={18} className="spin" /> : <ShareNetwork size={18} />}
              </button>
            )}
            {playlist.tracks.length > 0 && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Скачать всё"
                title="Скачать всё"
                disabled={downloadingAll}
                onClick={() => void handleDownloadAll()}
              >
                {downloadingAll ? <CircleNotch size={18} className="spin" /> : <DownloadSimple size={18} />}
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Удалить плейлист" onClick={() => setConfirmDelete(true)}>
              <Trash size={18} />
            </button>
          </div>
        )}
        {confirmDelete && (
          <div className="row library-detail-actions">
            <button type="button" className="action-btn action-btn--destructive" aria-label="Подтвердить удаление" onClick={() => void handleDelete()}>
              <Check size={18} weight="bold" />
            </button>
            <button type="button" className="action-btn" aria-label="Отмена" onClick={() => setConfirmDelete(false)}>
              <X size={18} weight="bold" />
            </button>
          </div>
        )}
      </div>

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

      {loadError && (
        <div className="library-load-error" role="alert">
          <p>Не удалось загрузить плейлист.</p>
          <button type="button" className="glass-button" onClick={loadPlaylist}>Попробовать снова</button>
        </div>
      )}

      {playlist === null && !loadError && (
        <p className="text-muted search-status mt-12">
          <CircleNotch size={16} className="spin" /> Загружаю…
        </p>
      )}

      {playlist && (
        <>
          {renaming ? (
            <input
              className="playlist-name-input mt-12"
              aria-label="Название плейлиста"
              autoFocus
              value={nameDraft}
              maxLength={200}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => void handleRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename();
                if (e.key === "Escape") setRenaming(false);
              }}
            />
          ) : (
            <h1 className="playlist-name-title mt-12">
              {playlist.name}
              <button
                type="button"
                className="playlist-name-edit-btn"
                aria-label={`Переименовать плейлист «${playlist.name}»`}
                onClick={() => { setNameDraft(playlist.name); setRenaming(true); }}
              >
                <PencilSimple size={16} weight="bold" className="playlist-name-edit-icon" />
              </button>
            </h1>
          )}

          {playlist.tracks.length === 0 ? (
            <EmptyState icon={<PlaylistIcon size={22} weight="bold" />} label="В плейлисте пока нет треков" />
          ) : (
            <div className="stack reveal-stagger mt-12 playlist-track-list">
              {playlist.tracks.map((track, i) => (
                <TrackRow
                  key={track.uri}
                  style={{ ["--i" as string]: i }}
                  onClick={() =>
                    player.toggle(
                      { uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork ?? undefined },
                      queue,
                    )
                  }
                  artwork={track.artwork}
                  title={track.title}
                  meta={track.artist}
                  metaClassName="search-row-meta"
                  trailing={
                    <>
                      {removing[track.uri] && <CircleNotch size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
                      <button
                        type="button"
                        className="icon-btn track-download-btn"
                        aria-label={trackDownloads[track.uri] === "sent" ? "Отправлено в чат" : "Скачать"}
                        title={trackDownloads[track.uri] === "sent" ? "Отправлено в чат" : "Скачать"}
                        disabled={trackDownloads[track.uri] === "sending"}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTrackDownload(track);
                        }}
                      >
                        {trackDownloads[track.uri] === "sending" ? (
                          <CircleNotch size={18} className="spin" />
                        ) : trackDownloads[track.uri] === "sent" ? (
                          <Check size={18} weight="bold" />
                        ) : (
                          <DownloadSimple size={18} />
                        )}
                      </button>
                      <TrackOverflowMenu
                        actions={[
                          {
                            key: "remove",
                            label: "Убрать из плейлиста",
                            icon: <Trash size={18} />,
                            disabled: removing[track.uri],
                            destructive: true,
                            onClick: () => void handleRemoveTrack(track.uri),
                          },
                        ]}
                      />
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function PlaylistsScreen({ onOpenHistory, onNewPrompt }: { onOpenHistory: (entry: HistoryEntry) => void; onNewPrompt: () => void }) {
  const player = usePlayer();
  // The full track list (title/artist/artwork) is content this screen owns —
  // the shared my-music store only tracks a uri->saved boolean, not enough to
  // render this section. Removal below still routes through the store's
  // toggleSaved so every other screen's heart updates immediately instead of
  // only on this screen's next mount.
  const [tracks, setTracks] = useState<SavedTrack[] | null>(null);
  const [tracksError, setTracksError] = useState(false);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [openPlaylistId, setOpenPlaylistId] = useState<number | null>(null);
  const [trackDownloads, setTrackDownloads] = useState<Record<string, "sending" | "sent">>({});
  const { toggleSaved } = useMyMusic();

  function loadTracks() {
    setTracksError(false);
    setTracks(null);
    api.myMusic().then((r) => setTracks(r.tracks)).catch(() => setTracksError(true));
  }

  useEffect(loadTracks, []);

  useEffect(() => {
    const first = tracks?.[0];
    if (!first) return;
    player.preload({ ...first, artwork: first.artwork ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks?.[0]?.uri]);

  const queue = useMemo(
    () => (tracks ?? []).map((t) => ({ uri: t.uri, title: t.title, artist: t.artist, artwork: t.artwork ?? undefined })),
    [tracks],
  );

  async function handleRemove(track: SavedTrack) {
    setRemoving((prev) => ({ ...prev, [track.uri]: true }));
    const succeeded = await toggleSaved(track);
    if (succeeded) {
      setTracks((prev) => (prev ?? []).filter((t) => t.uri !== track.uri));
    } else {
      setRemoving((prev) => ({ ...prev, [track.uri]: false }));
    }
  }

  async function handleTrackDownload(track: SavedTrack) {
    if (trackDownloads[track.uri] === "sending") return;
    setTrackDownloads((m) => ({ ...m, [track.uri]: "sending" }));
    try {
      await api.download(`${track.title} — ${track.artist}`, [
        { uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork ?? undefined },
      ]);
      setTrackDownloads((m) => ({ ...m, [track.uri]: "sent" }));
      window.dispatchEvent(new CustomEvent("download-created"));
    } catch {
      setTrackDownloads((m) => {
        const next = { ...m };
        delete next[track.uri];
        return next;
      });
    }
  }

  if (openPlaylistId !== null) {
    return <PlaylistDetailView id={openPlaylistId} onBack={() => setOpenPlaylistId(null)} />;
  }

  return (
    <div className="stack">
      <PlaylistsSection onOpen={setOpenPlaylistId} onNewPrompt={onNewPrompt} />

      <section className="reveal library-section library-tracks">
        <h2 className="screen-title">Треки</h2>

        {tracksError && (
          <div className="library-load-error" role="alert">
            <p>Не удалось загрузить сохранённые треки.</p>
            <button type="button" className="glass-button" onClick={loadTracks}>Попробовать снова</button>
          </div>
        )}

        {tracks === null && !tracksError && (
          <p className="text-muted search-status">
            <CircleNotch size={16} className="spin" /> Загружаю…
          </p>
        )}

        {tracks !== null && tracks.length === 0 && (
          <EmptyState icon={<MusicNotes size={22} weight="bold" />} label="Пока нет сохранённых треков" />
        )}

        {tracks !== null && tracks.length > 0 && (
          <div className="stack reveal-stagger">
            {tracks.map((track, i) => (
              <TrackRow
                key={track.uri}
                style={{ ["--i" as string]: i }}
                onClick={() =>
                  player.toggle(
                    { uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork ?? undefined },
                    queue,
                  )
                }
                artwork={track.artwork}
                title={track.title}
                meta={track.artist}
                metaClassName="search-row-meta"
                trailing={
                  <>
                    {removing[track.uri] && <CircleNotch size={16} className="spin" style={{ color: "var(--text-muted)" }} />}
                    <button
                      type="button"
                      className="icon-btn track-download-btn"
                      aria-label={trackDownloads[track.uri] === "sent" ? "Отправлено в чат" : "Скачать"}
                      title={trackDownloads[track.uri] === "sent" ? "Отправлено в чат" : "Скачать"}
                      disabled={trackDownloads[track.uri] === "sending"}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleTrackDownload(track);
                      }}
                    >
                      {trackDownloads[track.uri] === "sending" ? (
                        <CircleNotch size={18} className="spin" />
                      ) : trackDownloads[track.uri] === "sent" ? (
                        <Check size={18} weight="bold" />
                      ) : (
                        <DownloadSimple size={18} />
                      )}
                    </button>
                    <TrackOverflowMenu
                      actions={[
                        {
                          key: "add-to-playlist",
                          label: "Добавить в плейлист",
                          icon: <ListPlus size={18} weight="bold" />,
                          onClick: () =>
                            requestAddToPlaylist({ uri: track.uri, title: track.title, artist: track.artist, artwork: track.artwork ?? undefined }),
                        },
                        {
                          key: "remove",
                          label: "Убрать из избранного",
                          icon: <Trash size={18} />,
                          disabled: removing[track.uri],
                          destructive: true,
                          onClick: () => void handleRemove(track),
                        },
                      ]}
                    />
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <LibrarySection onOpen={onOpenHistory} />
    </div>
  );
}
