import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleNotch, MagnifyingGlass, Sparkle } from "../icons";
import { api, type HistoryEntry, type SuggestionsResponse } from "../lib/api";
import type { AgentProgressEvent } from "../lib/api";
import { EMPTY_SUGGESTIONS, samplePromptExamples } from "../lib/suggestions";
import { AiMode } from "./AiMode";
import { SearchMode } from "./SearchMode";

const MAX_INPUT_HEIGHT = 96;

type Mode = "ai" | "search";

/**
 * The create tab's shell: hero, mode toggle and the shared input. Each mode's
 * body — including all of search's own state — lives in AiMode / SearchMode,
 * which keeps this file about the one thing both modes share: the prompt.
 */
export function PromptScreen({
  onSubmit,
  busy,
  progress,
  onOpenArtist,
  onOpenGeneration,
  initialMode,
  initialQuery,
}: {
  onSubmit: (prompt: string) => void;
  busy: boolean;
  progress: AgentProgressEvent[];
  onOpenArtist: (target: { id?: string; name?: string }) => void;
  onOpenGeneration: (entry: HistoryEntry) => void;
  initialMode?: Mode;
  initialQuery?: string;
}) {
  const [prompt, setPrompt] = useState(() => initialQuery?.trim() ?? "");
  const [mode, setMode] = useState<Mode>(
    () => initialMode ?? (new URLSearchParams(window.location.search).get("mode") === "search" ? "search" : "ai"),
  );
  const [suggestions, setSuggestions] = useState<SuggestionsResponse>(EMPTY_SUGGESTIONS);
  const [promptExamples, setPromptExamples] = useState(() => samplePromptExamples());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The header can navigate to the existing prompt screen without remounting
  // it. Keep the visible mode in sync with that navigation target.
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // One SQLite-backed call, so it is cheap enough to fetch on mount and lets
  // both modes fill their empty state without a spinner.
  useEffect(() => {
    let cancelled = false;
    api
      .suggestions()
      .then((data) => {
        if (cancelled) return;
        setSuggestions(data);
        // Re-roll now that the user's own artists are available to draw from.
        setPromptExamples((current) => samplePromptExamples(current, data.topArtists));
      })
      .catch(() => {
        // Empty state falls back to the generic examples already on screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = mode === "ai" && !busy && prompt.trim().length > 0;

  useEffect(() => {
    if (mode !== "search") return;
    const el = inputRef.current;
    if (!el) return;
    // Autofocus search so the first action is typing, not mode-picking.
    // preventScroll: the pill is already on screen, and letting the browser
    // scroll it into view on focus makes the card visibly jump.
    const t = setTimeout(() => el.focus({ preventScroll: true }), 40);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || !initialQuery) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [initialQuery]);

  function autoGrow() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit(prompt.trim());
  }

  function fillInput(value: string) {
    setPrompt(value);
    requestAnimationFrame(() => {
      autoGrow();
      inputRef.current?.focus({ preventScroll: true });
    });
  }

  function refreshPromptExamples() {
    setPromptExamples((current) => samplePromptExamples(current, suggestions.topArtists));
  }

  const MODES: { id: Mode; label: string; icon: typeof Sparkle }[] = [
    { id: "ai", label: "Подобрать", icon: Sparkle },
    { id: "search", label: "Найти", icon: MagnifyingGlass },
  ];

  return (
    <div className={`reveal prompt-card${mode === "search" ? " prompt-card--search" : ""}${busy ? " prompt-card--busy" : ""}`}>
      <div className="prompt-compose">
        <h1 className="sr-only">{mode === "ai" ? "Подобрать музыку" : "Найти музыку"}</h1>

        <div className="prompt-modes" role="group" aria-label="Режим">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                className={`prompt-mode-seg-btn${mode === m.id ? " active" : ""}`}
                aria-pressed={mode === m.id}
                onClick={() => {
                  if (m.id === "ai" && !prompt.trim()) refreshPromptExamples();
                  setMode(m.id);
                }}
              >
                <Icon size={20} weight={mode === m.id ? "fill" : "regular"} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`prompt-pill${mode === "search" ? " prompt-pill--search" : ""}`}>
          {mode === "search" && (
            <span className="prompt-pill-icon" aria-hidden>
              <MagnifyingGlass size={18} weight="bold" />
            </span>
          )}
          <textarea
            ref={inputRef}
            className="prompt-pill-input"
            rows={1}
            placeholder={mode === "ai" ? "Опиши, что хочется послушать" : "Трек, исполнитель или альбом"}
            aria-label={mode === "ai" ? "Опиши, что хочется послушать" : "Трек, исполнитель или альбом"}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (mode === "ai" && e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={busy}
          />
          {mode === "ai" && (
            <button
              type="button"
              className="prompt-submit"
              aria-label="Собрать плейлист"
              disabled={!canSubmit}
              onClick={submit}
            >
              {busy ? <CircleNotch size={18} weight="bold" className="spin" /> : <ArrowUp size={18} weight="bold" />}
            </button>
          )}
        </div>
      </div>

      {/* Wraps the mode body (both return fragments) so the desktop 2-column
          grid has one spanning element for the right column instead of N
          siblings interleaved with the composer's own rows — see glass.css. */}
      <div className="prompt-body">
        {mode === "ai" ? (
          <AiMode
            busy={busy}
            prompt={prompt}
            progress={progress}
            suggestions={suggestions}
            examples={promptExamples}
            onRefreshExamples={refreshPromptExamples}
            onPickPrompt={fillInput}
            onOpenGeneration={onOpenGeneration}
            onOpenArtist={onOpenArtist}
          />
        ) : (
          <SearchMode
            query={prompt}
            suggestions={suggestions}
            onOpenArtist={onOpenArtist}
            onPickQuery={fillInput}
          />
        )}
      </div>

    </div>
  );
}
