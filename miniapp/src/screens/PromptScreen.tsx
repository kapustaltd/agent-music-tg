import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleNotch, MagnifyingGlass } from "../icons";
import { api, type HistoryEntry, type SuggestionsResponse } from "../lib/api";
import type { AgentProgressEvent } from "../lib/api";
import { EMPTY_SUGGESTIONS, samplePromptExamples } from "../lib/suggestions";
import { Segmented } from "../components/Segmented";
import { AiMode } from "./AiMode";
import { SearchMode } from "./SearchMode";

const MAX_INPUT_HEIGHT = 96;

type Mode = "ai" | "search";

const PROMPT_MODES = ["ai", "search"] as const;
const PROMPT_MODE_LABELS: Record<Mode, string> = {
  ai: "Подобрать",
  search: "Поиск",
};

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [requestCollapsed, setRequestCollapsed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The header can navigate to the existing prompt screen without remounting
  // it. Keep the visible mode in sync with that navigation target.
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // A failed request returns to the composer so the user can correct it.
    // The successful path collapses synchronously in submit() before the
    // parent flips busy, avoiding a frame with two activity indicators.
    if (!busy) setRequestCollapsed(false);
  }, [busy]);

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
    const value = prompt.trim();
    if (value.length < 2 || !/[\p{L}\p{N}]/u.test(value)) {
      setValidationError("Не понял запрос. Выбери настроение или опиши музыку своими словами.");
      return;
    }
    setValidationError(null);
    // Commit the compact state before notifying the parent. React may render
    // once with busy=true before the parent's state update reaches this tree;
    // setting this here keeps the composer from briefly showing its spinner
    // next to GenerationStatus' single progress indicator.
    setRequestCollapsed(true);
    onSubmit(value);
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

  return (
    <div
      className={`reveal prompt-card${mode === "search" ? " prompt-card--search" : ""}${busy && requestCollapsed ? " prompt-card--busy" : ""}`}
      aria-busy={busy}
    >
      {busy && requestCollapsed ? (
        <div className="prompt-request-summary" aria-label="Текущий запрос">
          <span className="prompt-request-summary-copy">
            <span className="prompt-request-summary-label">Запрос</span>
            <strong>{prompt}</strong>
          </span>
          <button type="button" className="prompt-request-summary-edit" onClick={() => setRequestCollapsed(false)}>
            Изменить
          </button>
        </div>
      ) : (
        <div className="prompt-compose">
          <Segmented<Mode>
            ariaLabel="Режим"
            role="radiogroup"
            fill
            options={PROMPT_MODES}
            labels={PROMPT_MODE_LABELS}
            value={mode}
            onChange={(nextMode) => {
              if (nextMode === "ai" && !prompt.trim()) refreshPromptExamples();
              setMode(nextMode);
            }}
          />

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
              placeholder={mode === "ai" ? "Что хочется послушать?" : "Трек, исполнитель или альбом"}
              aria-label={mode === "ai" ? "Опиши, что хочется послушать" : "Трек, исполнитель или альбом"}
              aria-invalid={validationError ? true : undefined}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (validationError) setValidationError(null);
                autoGrow();
              }}
              onKeyDown={(e) => {
                if (mode === "ai" && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
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
          {validationError && <p className="prompt-validation" role="alert">{validationError}</p>}
        </div>
      )}

      {/* Wraps the mode body (both return fragments) so the desktop 2-column
          grid has one spanning element for the right column instead of N
          siblings interleaved with the composer's own rows — see glass.css. */}
      <div className="prompt-body">
        {mode === "ai" ? (
          <AiMode
            busy={busy}
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
