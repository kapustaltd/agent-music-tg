import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { MagnifyingGlass, UserCircle } from "./icons";
import { PromptScreen } from "./screens/PromptScreen";
import { ClarifyScreen } from "./screens/ClarifyScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import BuyScreen from "./screens/BuyScreen";
import ProfileScreen from "./screens/ProfileScreen";
import HelpScreen from "./screens/HelpScreen";
import PlaylistsScreen from "./screens/PlaylistsScreen";
import { GlassPanel } from "./components/GlassPanel";
import { ScreenTransition } from "./components/ScreenTransition";
import { ErrorBanner } from "./components/ErrorBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  api,
  type AgentProgressEvent,
  type MeResponse,
  type FinalizedPlaylist,
  type ShopConfig,
  type HistoryEntry,
  SubscriptionRequiredError,
  type SubscriptionChannel,
} from "./lib/api";
import { getTelegramWebApp, getInitData, callIfSupported } from "./lib/telegram";
import { parseShareToken } from "./lib/share";
import { useKeyboardInset } from "./lib/keyboard";
import { PlayerProvider, usePlayer } from "./lib/player";
import { MyMusicProvider } from "./lib/my-music";
import { PlayerBar } from "./components/PlayerBar";
import { WebNowPlaying } from "./components/WebNowPlaying";
import { BottomNav } from "./components/BottomNav";
import { PlayerScreen } from "./screens/PlayerScreen";
import { SharedPlaylistScreen } from "./screens/SharedPlaylistScreen";
import { ArtistScreen } from "./screens/ArtistScreen";
import { AddToPlaylistSheet } from "./components/AddToPlaylistSheet";
import { SubscriptionGate } from "./components/SubscriptionGate";
import { applyAccent, initialAccent } from "./lib/accent";
import { Onboarding } from "./components/Onboarding";
import { completeOnboarding, shouldShowOnboarding } from "./lib/onboarding";
import { BrandMark } from "./components/BrandMark";

// Lazy: the admin screen's own chunk is only fetched when isAdmin is true,
// so it never ships to a regular allowed user's browser. The real
// enforcement boundary is still server-side (see api/middleware.ts).
const AdminScreen = lazy(() => import("./screens/AdminScreen"));

type Screen =
  | { kind: "prompt"; initialMode?: "ai" | "search"; initialQuery?: string }
  | { kind: "clarify"; question: string; options: string[] }
  | { kind: "results"; playlist: FinalizedPlaylist; generationId: number; saved?: boolean; request?: string }
  | { kind: "shared"; token: string }
  | { kind: "buy"; reason?: string }
  | { kind: "playlists" }
  | { kind: "profile" }
  | { kind: "help" }
  | { kind: "admin" };

function activeTab(screen: Screen): "create" | "shop" | "playlists" | "admin" | null {
  switch (screen.kind) {
    case "prompt":
    case "clarify":
    case "results":
    // A received playlist belongs to the create flow: the next thing this
    // person does is make one of their own.
    case "shared":
      return "create";
    case "buy":
      return "shop";
    case "playlists":
      return "playlists";
    case "profile":
    case "help":
      return null;
    case "admin":
      return "admin";
  }
}

export function App() {
  return (
    <PlayerProvider>
      <MyMusicProvider>
        <AppInner />
      </MyMusicProvider>
    </PlayerProvider>
  );
}

function AppInner() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [history, setHistory] = useState<Screen[]>([{ kind: "prompt" }]);
  const screen = history[history.length - 1];
  const [showPlayer, setShowPlayer] = useState(false);
  // `fromPlayer` is fixed at open time (not derived from the live `showPlayer`
  // flag) so the artist screen only sits above the full player when it was
  // actually opened from within it. Otherwise, opening the player later while
  // an artist card is already up (e.g. from search) would silently jump the
  // card above the player and block it with no way back in.
  const [artistTarget, setArtistTarget] = useState<{ id?: string; name?: string; fromPlayer?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<AgentProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [accent, setAccent] = useState<string>(() => initialAccent());
  const [showOnboarding, setShowOnboarding] = useState(() => shouldShowOnboarding());
  const [subscriptionGate, setSubscriptionGate] = useState<SubscriptionChannel[] | null>(null);

  function changeAccent(value: string) {
    setAccent(value);
    applyAccent(value);
  }
  const [lastGenerate, setLastGenerate] = useState<{ prompt: string } | null>(null);
  const [lastClarify, setLastClarify] = useState<{ answer: string } | null>(null);
  const [lastCreateScreen, setLastCreateScreen] = useState<Screen>({ kind: "prompt" });

  const player = usePlayer();

  // The dock and the player bar are fixed to the bottom; the WebView floats
  // them over the keyboard when it opens. This publishes the keyboard's height
  // so the CSS can get them out of the way (see keyboard.ts).
  useKeyboardInset();

  useEffect(() => {
    const webApp = getTelegramWebApp();
    webApp?.ready();
    // Keep the regular expanded Mini App viewport, but do not request
    // fullscreen automatically: entering fullscreen should remain a user
    // choice in Telegram. disableVerticalSwipes() still prevents an accidental
    // swipe-down from collapsing/closing the app mid-use.
    webApp?.expand();
    callIfSupported(() => webApp?.disableVerticalSwipes?.());
    applyAccent(accent);
    api.me().then(setMe).catch((err) => {
      if (err instanceof SubscriptionRequiredError) {
        setSubscriptionGate(err.channels);
      }
    });
    api.shopConfig().then(setShopConfig).catch(() => {});

    // Bot inline buttons ("Поиск" / "Мои плейлисты" / "Моя музыка") deep-link
    // here with ?tab=... so they land on the right screen, not just the root.
    // mode=search (read by PromptScreen itself) additionally pre-selects the
    // search tab within "Создать".
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    // A share link opened through the bot lands here with ?share=<token>;
    // opened through startapp it arrives as Telegram's signed start_param.
    const shareToken =
      parseShareToken(new URLSearchParams(window.location.search).get("share"))
      ?? parseShareToken(new URLSearchParams(getInitData()).get("start_param"));
    if (shareToken) navigate({ kind: "shared", token: shareToken });
    else if (tabParam === "playlists") navigate({ kind: "playlists" });
    else if (tabParam === "profile") navigate({ kind: "profile" });
    else if (tabParam === "help") navigate({ kind: "help" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap the wallet chip: anything that changes the balance (generation,
  // extend, purchase, trial claim) dispatches "balance-changed".
  useEffect(() => {
    const onBalanceChanged = () => {
      api.me().then(setMe).catch(() => {});
    };
    window.addEventListener("balance-changed", onBalanceChanged);
    return () => window.removeEventListener("balance-changed", onBalanceChanged);
  }, []);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp?.BackButton) return;
    if (artistTarget || showPlayer || history.length > 1) {
      webApp.BackButton.show();
    } else {
      webApp.BackButton.hide();
    }
  }, [artistTarget, showPlayer, history.length]);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    const bb = webApp?.BackButton;
    if (!bb) return;
    const handler = () => {
      if (artistTarget) {
        setArtistTarget(null);
      } else if (showPlayer) {
        setShowPlayer(false);
      } else {
        setHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
      }
    };
    bb.onClick(handler);
    return () => {
      bb.offClick(handler);
    };
  }, [artistTarget, showPlayer]);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    if (player.track && player.status !== "idle") {
      webApp.enableClosingConfirmation?.();
    } else {
      webApp.disableClosingConfirmation?.();
    }
  }, [player.track, player.status]);

  async function handleSubmit(prompt: string) {
    setLastGenerate({ prompt });
    setLastClarify(null);
    setBusy(true);
    setError(null);
    setEvents([]);
    try {
      const outcome = await api.generateStream(prompt, (e) => setEvents((prev) => [...prev, e]));
      applyOutcome(outcome, prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleClarifyAnswer(answer: string) {
    setLastClarify({ answer });
    setBusy(true);
    setError(null);
    setEvents([]);
    try {
      const outcome = await api.generateResumeStream(answer, (e) => setEvents((prev) => [...prev, e]));
      if (outcome.status === "error") {
        openPlainSearchAfterClarifyError(answer);
        return;
      }
      applyOutcome(outcome, lastGenerate?.prompt);
    } catch {
      openPlainSearchAfterClarifyError(answer);
    } finally {
      setBusy(false);
    }
  }

  function openPlainSearchAfterClarifyError(answer: string) {
    const query = [lastGenerate?.prompt, answer]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" ");

    setError(null);
    setEvents([]);
    setLastClarify(null);
    navigate({ kind: "prompt", initialMode: "search", initialQuery: query }, "back");
  }

  function retryLast() {
    if (lastClarify) void handleClarifyAnswer(lastClarify.answer);
    else if (lastGenerate) void handleSubmit(lastGenerate.prompt);
  }

  function navigate(target: Screen, dir?: "forward" | "back") {
    // Any real navigation (tab switch, screen push, back) must drop overlays
    // sitting on top — otherwise the artist card / full player stays mounted
    // above the newly-navigated screen with no way to reach it.
    setArtistTarget(null);
    setShowPlayer(false);
    if (dir === "back") {
      setHistory([target]);
      return;
    }
    if (activeTab(target) !== tab) {
      // Switching tabs resets the stack: each tab is its own root, not a push.
      setHistory([target]);
    } else {
      setHistory(prev => {
        const next = [...prev, target];
        return next.length > 10 ? next.slice(next.length - 10) : next;
      });
    }
  }

  function formatRetryTime(retryAt: number): string {
    const t = new Date(retryAt * 1000);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function applyOutcome(outcome: Awaited<ReturnType<typeof api.generate>>, request = lastGenerate?.prompt) {
    if (outcome.status === "clarify") {
      navigate({ kind: "clarify", question: outcome.question, options: outcome.options });
    } else if (outcome.status === "ok") {
      window.dispatchEvent(new CustomEvent("balance-changed"));
      navigate({
        kind: "results",
        playlist: outcome.playlist,
        generationId: outcome.generationId,
        request,
      });
    } else if (outcome.status === "needs_purchase") {
      navigate({ kind: "buy", reason: "Генерации закончились. Выберите пакет, чтобы продолжить." });
    } else if (outcome.status === "rate_limited") {
      setError(`Лимит генераций по подписке исчерпан. Снова доступно в ${formatRetryTime(outcome.retryAt)}.`);
    } else {
      setError(outcome.message);
    }
  }

  /**
   * Opens a past generation as a results screen. `saved` is explicit because
   * the library lists saved generations only, while the create screen's
   * "Продолжить" rail also surfaces unsaved ones.
   */
  function openGeneration(entry: HistoryEntry, saved: boolean) {
    navigate({
      kind: "results",
      generationId: entry.id,
      saved,
      request: entry.prompt,
      playlist: { name: entry.playlistName ?? entry.prompt, tracks: entry.tracks },
    });
  }

  function renderScreen(): ReactNode | null {
    switch (screen.kind) {
      case "prompt":
        return (
          <PromptScreen
            onSubmit={handleSubmit}
            busy={busy}
            progress={events}
            onOpenArtist={(target) => setArtistTarget(target)}
            onOpenGeneration={(entry) => openGeneration(entry, entry.saved ?? false)}
            initialMode={screen.initialMode}
            initialQuery={screen.initialQuery}
          />
        );
      case "clarify":
        return (
          <ClarifyScreen
            question={screen.question}
            options={screen.options}
            onAnswer={handleClarifyAnswer}
            busy={busy}
            progress={events}
          />
        );
      case "results":
        return (
          <ResultsScreen
            playlist={screen.playlist}
            generationId={screen.generationId}
            initialSaved={screen.saved}
          />
        );
      case "shared":
        return (
          <SharedPlaylistScreen
            token={screen.token}
            onGenerateOwn={(prompt) => navigate({ kind: "prompt", initialQuery: prompt ?? undefined })}
          />
        );
      case "buy":
        return <BuyScreen reason={screen.reason} />;
      case "playlists":
        return (
          <PlaylistsScreen
            onOpenHistory={(entry: HistoryEntry) => openGeneration(entry, true)}
            onNewPrompt={() => navigate({ kind: "prompt" }, "back")}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            me={me}
            onGoShop={() => navigate({ kind: "buy" })}
            onOpenHelp={() => navigate({ kind: "help" })}
            accent={accent}
            onChangeAccent={changeAccent}
          />
        );
      case "help":
        return (
          <HelpScreen
            onReplayOnboarding={() => setShowOnboarding(true)}
            onStart={() => navigate({ kind: "prompt" }, "back")}
          />
        );
      case "admin":
        return isAdmin ? (
          <Suspense fallback={<GlassPanel>Загрузка…</GlassPanel>}>
            <AdminScreen />
          </Suspense>
        ) : null;
    }
  }

  const tab = activeTab(screen);
  const isAdmin = me?.isAdmin ?? false;

  // Remember the last screen shown on the "create" tab (prompt/clarify/results)
  // so switching to another tab and back restores it instead of resetting.
  useEffect(() => {
    if (tab === "create") setLastCreateScreen(screen);
  }, [tab, screen]);

  function handleReset() {
    setHistory([{ kind: "prompt" }]);
    setError(null);
  }

  function dismissOnboarding() {
    completeOnboarding();
    setShowOnboarding(false);
  }

  function startFromOnboarding(prompt: string) {
    completeOnboarding();
    setShowOnboarding(false);
    navigate({ kind: "prompt", initialMode: "ai", initialQuery: prompt }, "back");
  }

  if (showOnboarding) {
    return <Onboarding onSkip={dismissOnboarding} onStart={startFromOnboarding} />;
  }

  if (subscriptionGate) {
    return (
      <SubscriptionGate
        channels={subscriptionGate}
        onPassed={() => {
          setSubscriptionGate(null);
          api.me().then(setMe).catch(() => {});
          api.shopConfig().then(setShopConfig).catch(() => {});
        }}
      />
    );
  }

  return (
    <ErrorBoundary onReset={handleReset}>
    <main className={`app-shell app-shell--${screen.kind}`}>
      <aside className="app-sidebar" aria-label="Навигация приложения">
        <header className="app-top-bar">
          <button
            type="button"
            className="app-top-search"
            aria-label="Открыть поиск"
            title="Поиск"
            onClick={() => navigate({ kind: "prompt", initialMode: "search" }, "back")}
          >
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
          </button>

        <span className="app-top-brand" title="music agent">
          <span className="app-top-logo" aria-hidden>
            <BrandMark size={26} />
          </span>
          <span className="app-top-brand-title">{shopConfig?.headerTitle || "agent music"}</span>
        </span>
        <span className="app-top-actions">
          <button
            type="button"
            className="app-top-account"
            aria-label="Открыть профиль"
            title="Профиль"
            onClick={() => navigate({ kind: "profile" })}
          >
            <UserCircle size={18} weight="bold" aria-hidden="true" />
            <span className="app-top-account-label">Профиль</span>
          </button>
        </span>
        </header>

        <BottomNav
          tab={tab}
          isAdmin={isAdmin}
          onTab={(t) => {
            navigate(
                t === "shop"
                ? { kind: "buy" }
                : t === "create"
                  ? lastCreateScreen
                  : t === "playlists"
                    ? { kind: "playlists" }
                    : { kind: "admin" },
            );
          }}
        />
      </aside>

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} onRetry={retryLast} />
      )}

      <ScreenTransition kind={screen.kind}>
        {renderScreen()}
      </ScreenTransition>

      <WebNowPlaying onOpen={() => setShowPlayer(true)} />
      <PlayerBar onOpen={() => setShowPlayer(true)} />
    </main>
      {showPlayer && (
        <PlayerScreen onClose={() => setShowPlayer(false)} onOpenArtist={(name) => setArtistTarget({ name, fromPlayer: true })} />
      )}
      {artistTarget && (
        <ArtistScreen target={artistTarget} onClose={() => setArtistTarget(null)} nested={!!artistTarget.fromPlayer} />
      )}
      <AddToPlaylistSheet />
    </ErrorBoundary>
  );
}
