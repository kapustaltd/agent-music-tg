import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api as clientApi, streamUrl, type MusicFeedbackEvent } from "./api";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface PlayerTrackInfo {
  uri: string;
  title: string;
  artist: string;
  artwork?: string;
  /** Sent with the stream request so a cross-platform substitute can be
   * length-checked against the real song. Optional — not every screen has it. */
  durationMs?: number;
}

interface PlayerState {
  track: PlayerTrackInfo | null;
  status: PlayerStatus;
  /** 0..1; NaN-safe (0 until duration is known). */
  progress: number;
  currentTime: number;
  duration: number;
  /** 0..1 */
  volume: number;
  muted: boolean;
  queue: PlayerTrackInfo[];
  queueIndex: number;
}

/** progress/currentTime/duration update at ~4Hz during playback; split out
 * into their own context so components that only need track/status/queue
 * (the vast majority of usePlayer() callers) don't re-render every tick. */
interface PlayerTimeInfo {
  /** 0..1; NaN-safe (0 until duration is known). */
  progress: number;
  currentTime: number;
  duration: number;
}

interface PlayerApi extends Omit<PlayerState, "progress" | "currentTime" | "duration"> {
  /** Toggle playback; pass `queue` (the playlist's tracks) so next/prev work within it. */
  toggle(track: PlayerTrackInfo, queue?: PlayerTrackInfo[]): void;
  /** Starts buffering a likely next choice without starting playback. */
  preload(track: PlayerTrackInfo): void;
  seek(fraction: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  nextTrack(): void;
  previousTrack(): void;
  setQueue(tracks: PlayerTrackInfo[], startIndex?: number): void;
}

const VOLUME_KEY = "player:volume";
const DEFAULT_VOLUME = 0.7;

/** Max extra play attempts when a track fails to start (total = 1 + MAX_RETRIES). */
const MAX_RETRIES = 2;
/** Delay between retry attempts (ms). */
const RETRY_DELAY_MS = 100;

const FALLBACK_ARTWORK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">' +
  '<rect width="512" height="512" fill="#1a1a2e"/>' +
  '<text x="256" y="236" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="700" fill="#fff">Плейлист</text>' +
  '<text x="256" y="280" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="700" fill="#fff">Агент</text>' +
  "</svg>";
const FALLBACK_ARTWORK = `data:image/svg+xml,${encodeURIComponent(FALLBACK_ARTWORK_SVG)}`;

const PlayerContext = createContext<PlayerApi | null>(null);
const PlayerTimeContext = createContext<PlayerTimeInfo | null>(null);

export const PLAY_COMPLETION_FRACTION = 0.8;

interface PlaybackFeedbackSession {
  track: PlayerTrackInfo;
  started: boolean;
  completed: boolean;
  skipped: boolean;
  maxFraction: number;
}

/**
 * Small state machine kept outside React so feedback thresholds and
 * deduplication remain deterministic and testable. The emitter is always
 * isolated: analytics can fail without touching player state.
 */
export class PlaybackFeedbackTracker {
  private session: PlaybackFeedbackSession | null = null;

  constructor(
    private readonly emit: (event: MusicFeedbackEvent, track: PlayerTrackInfo) => void,
  ) {}

  private safeEmit(event: MusicFeedbackEvent, track: PlayerTrackInfo): void {
    try {
      this.emit(event, track);
    } catch {
      // Feedback is deliberately best-effort.
    }
  }

  private emitSkipIfNeeded(): void {
    const session = this.session;
    if (!session || !session.started || session.completed || session.skipped) return;
    session.skipped = true;
    this.safeEmit("skipped", session.track);
  }

  switchTo(track: PlayerTrackInfo): void {
    if (this.session?.track.uri === track.uri) return;
    this.emitSkipIfNeeded();
    this.session = { track, started: false, completed: false, skipped: false, maxFraction: 0 };
  }

  markPlaying(): void {
    const session = this.session;
    if (!session || session.started) return;
    session.started = true;
    this.safeEmit("play_started", session.track);
  }

  updateProgress(currentTime: number, duration: number): void {
    const session = this.session;
    if (!session || !session.started || !Number.isFinite(duration) || duration <= 0) return;
    const fraction = Math.min(Math.max(currentTime / duration, 0), 1);
    session.maxFraction = Math.max(session.maxFraction, fraction);
    if (!session.completed && session.maxFraction >= PLAY_COMPLETION_FRACTION) {
      session.completed = true;
      this.safeEmit("play_completed", session.track);
    }
  }

  markEnded(): void {
    const session = this.session;
    if (!session || !session.started || session.completed) return;
    session.completed = true;
    session.maxFraction = 1;
    this.safeEmit("play_completed", session.track);
  }
}

interface MediaSessionActions {
  play(): void;
  pause(): void;
  nextTrack(): void;
  previousTrack(): void;
  seekTo?(positionSeconds: number): void;
}

/** Keeps OS media-control wiring testable without a real browser media session. */
export function configureMediaSessionActions(ms: MediaSession, actions: MediaSessionActions): () => void {
  ms.setActionHandler("play", actions.play);
  ms.setActionHandler("pause", actions.pause);
  ms.setActionHandler("nexttrack", actions.nextTrack);
  ms.setActionHandler("previoustrack", actions.previousTrack);
  ms.setActionHandler("seekto", (details) => {
    if (actions.seekTo && typeof details.seekTime === "number") {
      actions.seekTo(details.seekTime);
    }
  });

  return () => {
    ms.setActionHandler("play", null);
    ms.setActionHandler("pause", null);
    ms.setActionHandler("nexttrack", null);
    ms.setActionHandler("previoustrack", null);
    ms.setActionHandler("seekto", null);
  };
}

/** Publishes a finite timeline so lock-screen players can render a scrubber. */
export function syncMediaSessionPosition(
  ms: MediaSession,
  duration: number,
  position: number,
  playbackRate = 1,
): void {
  if (typeof ms.setPositionState !== "function") return;
  if (!Number.isFinite(duration) || duration <= 0) {
    ms.setPositionState();
    return;
  }
  ms.setPositionState({
    duration,
    position: Math.min(Math.max(Number.isFinite(position) ? position : 0, 0), duration),
    playbackRate: Number.isFinite(playbackRate) && playbackRate !== 0 ? playbackRate : 1,
  });
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** At most one speculative request is kept alive. It is adopted on click. */
  const preloadedAudioRef = useRef<{ uri: string; audio: HTMLAudioElement } | null>(null);
  const prevVolumeRef = useRef(DEFAULT_VOLUME);
  const apiRef = useRef<PlayerApi>(null!);
  const retryTimerRef = useRef<number | null>(null);
  /** Monotonically invalidates errors/rejections from an older source. */
  const playbackAttemptRef = useRef(0);
  const attemptRef = useRef(0);
  const failureHandledRef = useRef(false);
  const onAudioErrorRef = useRef<(() => void) | null>(null);
  const feedbackTrackerRef = useRef<PlaybackFeedbackTracker | null>(null);
  if (!feedbackTrackerRef.current) {
    feedbackTrackerRef.current = new PlaybackFeedbackTracker((event, track) => clientApi.musicFeedback(event, track));
  }
  const [state, setState] = useState<PlayerState>({
    track: null,
    status: "idle",
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume: DEFAULT_VOLUME,
    muted: false,
    queue: [],
    queueIndex: -1,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null) {
        const v = parseFloat(saved);
        if (Number.isFinite(v) && v >= 0 && v <= 1) {
          setState((s) => ({ ...s, volume: v }));
          if (audioRef.current) audioRef.current.volume = v;
        }
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      const preloaded = preloadedAudioRef.current?.audio;
      if (preloaded) {
        preloaded.pause();
        preloaded.removeAttribute("src");
        preloaded.load();
      }
    };
  }, []);

  function createAudio(): HTMLAudioElement {
    const audio = new Audio();
    // The source is assigned from the click handler, so allowing the element
    // to buffer immediately avoids an extra preload turn before play().
    audio.preload = "auto";
    audio.volume = state.volume;
    audio.addEventListener("playing", () => {
      if (audioRef.current !== audio) return;
      feedbackTrackerRef.current?.markPlaying();
      setState((s) => ({ ...s, status: "playing" }));
    });
    audio.addEventListener("pause", () => {
      if (audioRef.current !== audio) return;
      setState((s) => (s.status === "error" ? s : { ...s, status: "paused" }));
    });
    audio.addEventListener("ended", () => {
      if (audioRef.current !== audio) return;
      feedbackTrackerRef.current?.markEnded();
      const { queue, queueIndex } = apiRef.current;
      if (queueIndex >= 0 && queueIndex < queue.length - 1) {
        apiRef.current.nextTrack();
      } else {
        setState((s) => ({ ...s, status: "paused", progress: 0, currentTime: 0 }));
      }
    });
    audio.addEventListener("error", () => {
      // Replacing the media element isolates an old network error from the
      // newly selected track. The identity check also covers an abort/error
      // event delivered after the old element was detached.
      if (audioRef.current === audio) onAudioErrorRef.current?.();
    });
    audio.addEventListener("timeupdate", () => {
      if (audioRef.current !== audio) return;
      const fraction = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
      feedbackTrackerRef.current?.updateProgress(audio.currentTime, audio.duration);
      setState((s) => ({ ...s, progress: fraction, currentTime: audio.currentTime, duration: audio.duration }));
    });
    audio.addEventListener("loadedmetadata", () => {
      if (audioRef.current !== audio) return;
      setState((s) => ({ ...s, duration: audio.duration }));
    });
    audio.addEventListener("durationchange", () => {
      if (audioRef.current !== audio) return;
      setState((s) => ({ ...s, duration: audio.duration }));
    });
    return audio;
  }

  function ensureAudio(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const audio = createAudio();
    audioRef.current = audio;
    return audio;
  }

  function disposeAudio(audio: HTMLAudioElement): void {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  function discardPreloadedAudio(): void {
    const preloaded = preloadedAudioRef.current;
    if (!preloaded) return;
    preloadedAudioRef.current = null;
    disposeAudio(preloaded.audio);
  }

  function preload(track: PlayerTrackInfo): void {
    if (!track.uri || state.track?.uri === track.uri) return;
    if (preloadedAudioRef.current?.uri === track.uri) return;

    discardPreloadedAudio();
    const audio = createAudio();
    audio.src = streamUrl(track.uri, track);
    preloadedAudioRef.current = { uri: track.uri, audio };
    // `load()` is intentional: unlike `play()`, it is not blocked by mobile
    // autoplay policy, but it starts DNS/TLS/HTTP buffering before the tap.
    audio.load();
  }

  function adoptPreloadedAudio(uri: string): HTMLAudioElement | null {
    const preloaded = preloadedAudioRef.current;
    if (!preloaded || preloaded.uri !== uri) return null;
    preloadedAudioRef.current = null;
    if (preloaded.audio.error) {
      disposeAudio(preloaded.audio);
      return null;
    }

    const previous = audioRef.current;
    if (previous) {
      audioRef.current = null;
      disposeAudio(previous);
    }
    preloaded.audio.volume = state.volume;
    audioRef.current = preloaded.audio;
    return preloaded.audio;
  }

  function replaceAudio(): HTMLAudioElement {
    const previous = audioRef.current;
    if (previous) {
      audioRef.current = null;
      disposeAudio(previous);
    }
    discardPreloadedAudio();
    audioRef.current = null;
    return ensureAudio();
  }

  function cancelRetry() {
    playbackAttemptRef.current += 1;
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    failureHandledRef.current = false;
    onAudioErrorRef.current = null;
  }

  function handlePlayFailure(
    track: PlayerTrackInfo,
    queue: PlayerTrackInfo[] | undefined,
    playbackAttempt: number,
    source: string,
  ) {
    const audio = audioRef.current;
    // A single HTMLAudioElement emits an error when its old src is aborted by
    // a new one. Do not let that stale event retry the newly selected track.
    if (!audio || playbackAttemptRef.current !== playbackAttempt || audio.src !== source) return;
    if (failureHandledRef.current) return;
    failureHandledRef.current = true;
    if (attemptRef.current < MAX_RETRIES) {
      const next = attemptRef.current + 1;
      attemptRef.current = next;
      retryTimerRef.current = window.setTimeout(() => playTrack(track, queue, next), RETRY_DELAY_MS);
    } else {
      setState((s) => ({ ...s, status: "error" }));
    }
  }

  function playTrack(track: PlayerTrackInfo, queue?: PlayerTrackInfo[], attempt = 0) {
    cancelRetry();
    feedbackTrackerRef.current?.switchTo(track);
    const adopted = attempt === 0 ? adoptPreloadedAudio(track.uri) : null;
    const audio = adopted ?? replaceAudio();
    attemptRef.current = attempt;
    failureHandledRef.current = false;
    const nextQueue = queue ?? state.queue;
    const idx = nextQueue.findIndex((t) => t.uri === track.uri);
    setState((s) => ({
      ...s,
      queue: nextQueue,
      queueIndex: idx >= 0 ? idx : 0,
      track,
      status: "loading",
      progress: 0,
      currentTime: 0,
      duration: 0,
    }));
    // Title/artist ride along so the server can silently substitute the same
    // song from another platform if this source turns out to be unplayable.
    if (!adopted) {
      audio.src = streamUrl(track.uri, track) + (attempt > 0 ? `&_=${attempt}` : "");
    }
    const source = audio.src;
    const playbackAttempt = ++playbackAttemptRef.current;
    onAudioErrorRef.current = () => handlePlayFailure(track, queue, playbackAttempt, source);
    void audio.play().catch(() => handlePlayFailure(track, queue, playbackAttempt, source));

    const next = nextQueue[idx + 1];
    if (next) preload(next);
  }

  function resumeTrack(track: PlayerTrackInfo, queue?: PlayerTrackInfo[]) {
    const audio = ensureAudio();
    const source = audio.src;
    const playbackAttempt = ++playbackAttemptRef.current;
    attemptRef.current = 0;
    failureHandledRef.current = false;
    onAudioErrorRef.current = () => handlePlayFailure(track, queue, playbackAttempt, source);
    void audio.play().catch(() => handlePlayFailure(track, queue, playbackAttempt, source));
  }

  function setVolume(v: number) {
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    setState((s) => ({ ...s, volume: v, muted: false }));
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* localStorage unavailable */
    }
  }

  function toggleMute() {
    const audio = audioRef.current;
    setState((s) => {
      if (s.muted) {
        const restore = prevVolumeRef.current;
        if (audio) audio.volume = restore;
        return { ...s, muted: false, volume: restore };
      }
      prevVolumeRef.current = s.volume;
      if (audio) audio.volume = 0;
      return { ...s, muted: true, volume: 0 };
    });
  }

  const { track, status, volume, muted, queue, queueIndex } = state;

  const api = useMemo<PlayerApi>(() => {
    return {
      track,
      status,
      volume,
      muted,
      queue,
      queueIndex,
      preload,
      toggle(track, queue) {
        const audio = ensureAudio();
        if (state.track?.uri === track.uri) {
          cancelRetry();
          if (queue) {
            const idx = queue.findIndex((t) => t.uri === track.uri);
            setState((s) => ({ ...s, queue, queueIndex: idx >= 0 ? idx : 0 }));
          }
          if (state.status === "playing") {
            cancelRetry();
            audio.pause();
          } else if (state.status === "error") {
            playTrack(track, queue, 0);
          } else {
            resumeTrack(track, queue);
          }
          return;
        }
        playTrack(track, queue);
      },
      seek(fraction) {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = Math.min(Math.max(fraction, 0), 1) * audio.duration;
      },
      setVolume,
      toggleMute,
      nextTrack() {
        if (state.queue.length < 2) return;
        const nextIndex = state.queueIndex + 1;
        if (nextIndex >= state.queue.length) return;
        playTrack(state.queue[nextIndex], state.queue);
      },
      previousTrack() {
        if (state.queue.length < 2) return;
        const prevIndex = state.queueIndex - 1;
        if (prevIndex < 0) return;
        playTrack(state.queue[prevIndex], state.queue);
      },
      setQueue(tracks) {
        setState((s) => ({ ...s, queue: tracks, queueIndex: 0 }));
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, status, volume, muted, queue, queueIndex]);

  apiRef.current = api;

  const timeInfo = useMemo<PlayerTimeInfo>(
    () => ({ progress: state.progress, currentTime: state.currentTime, duration: state.duration }),
    [state.progress, state.currentTime, state.duration],
  );

  const artworkObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    const statusMap: Record<PlayerStatus, MediaSessionPlaybackState> = {
      idle: "none",
      loading: "none",
      playing: "playing",
      paused: "paused",
      error: "paused",
    };
    ms.playbackState = statusMap[state.status] ?? "none";

    if (!state.track) {
      if (artworkObjectUrlRef.current) {
        URL.revokeObjectURL(artworkObjectUrlRef.current);
        artworkObjectUrlRef.current = null;
      }
      ms.metadata = null;
      return;
    }

    const track = state.track;

    function setMetadata(artworkSrc: string, artworkType: string) {
      ms.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "Плейлист Агент",
        artwork: [{ src: artworkSrc, sizes: "512x512", type: artworkType }],
      });
    }

    setMetadata(FALLBACK_ARTWORK, "image/svg+xml");

    if (track.artwork) {
      fetch(track.artwork, { mode: "cors" })
        .then((res) => {
          if (!res.ok) throw new Error("fetch failed");
          return res.blob();
        })
        .then((blob) => {
          if (artworkObjectUrlRef.current) {
            URL.revokeObjectURL(artworkObjectUrlRef.current);
          }
          const url = URL.createObjectURL(blob);
          artworkObjectUrlRef.current = url;
          setMetadata(url, blob.type || "image/jpeg");
        })
        .catch(() => {
          /* keep FALLBACK_ARTWORK */
        });
    }

    const clearActions = configureMediaSessionActions(ms, {
      play: () => {
        if (apiRef.current.track && apiRef.current.status !== "playing") {
          apiRef.current.toggle(apiRef.current.track);
        }
      },
      pause: () => {
        if (apiRef.current.track && apiRef.current.status === "playing") {
          apiRef.current.toggle(apiRef.current.track);
        }
      },
      nextTrack: () => apiRef.current.nextTrack(),
      previousTrack: () => apiRef.current.previousTrack(),
      seekTo: (positionSeconds) => {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = Math.min(Math.max(positionSeconds, 0), audio.duration);
      },
    });

    return () => {
      if (artworkObjectUrlRef.current) {
        URL.revokeObjectURL(artworkObjectUrlRef.current);
        artworkObjectUrlRef.current = null;
      }
      clearActions();
    };
  }, [state.track?.uri, state.status, state.track]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const audio = audioRef.current;
    syncMediaSessionPosition(
      navigator.mediaSession,
      state.duration,
      state.currentTime,
      audio?.playbackRate ?? 1,
    );
  }, [state.currentTime, state.duration]);

  return (
    <PlayerContext.Provider value={api}>
      <PlayerTimeContext.Provider value={timeInfo}>{children}</PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

/** Progress/currentTime/duration, updating at ~4Hz during playback. Subscribe
 * only where that's actually rendered (the fullscreen player's scrubber) —
 * everywhere else, usePlayer() alone avoids re-rendering on every tick. */
export function usePlayerTime(): PlayerTimeInfo {
  const ctx = useContext(PlayerTimeContext);
  if (!ctx) throw new Error("usePlayerTime must be used inside PlayerProvider");
  return ctx;
}
