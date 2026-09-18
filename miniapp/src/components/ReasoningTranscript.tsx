import { useEffect, useRef } from "react";
import { toLines, countTools, type AgentEvent, type LineSegment } from "../lib/reasoning";

interface ReasoningTranscriptProps {
  /** Ordered agent events, folded via reduceEvents by the caller. */
  events: AgentEvent[];
  /** Whether the agent is actively working; inactive transcripts collapse to a summary. */
  active: boolean;
  /** Max pixel height before the transcript scrolls internally. */
  maxHeight?: number;
  /** Regular users get Russian tool labels instead of raw camelCase/snake_case names. */
  friendly?: boolean;
  /** Admins keep the completed transcript open so private model reasoning can be inspected. */
  showCompleted?: boolean;
}

const TONE_CLASS: Record<LineSegment["tone"], string> = {
  reasoning: "reasoning-tone-muted",
  call: "reasoning-tone-accent",
  args: "reasoning-tone-muted",
  ok: "reasoning-tone-ok",
  error: "reasoning-tone-error",
};

/** Marker glyphs map to a dot modifier class so CSS can style each kind distinctly. */
const MARKER_CLASS: Record<string, string> = {
  "⏺": "reasoning-dot-call",
  "⎿": "reasoning-dot-result",
  "·": "reasoning-dot-thought",
};

export function ReasoningTranscript({ events, active, maxHeight = 160, friendly, showCompleted = false }: ReasoningTranscriptProps) {
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const showTranscript = active || showCompleted;
  const lines = showTranscript ? toLines(events, { friendly }) : [];

  // Infinite status motion is useful only while visible. Keep the DOM marked
  // as running by default for older WebViews that lack IntersectionObserver.
  useEffect(() => {
    const el = rootRef.current;
    if (!active || !el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      el.dataset.motion = entry.isIntersecting ? "running" : "paused";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  // Stick-to-bottom: only auto-scroll if the user hasn't scrolled up to read
  // history. Re-engages automatically once they scroll back to the tail.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }

  if (!active && !showCompleted) {
    const toolCount = countTools(events);
    if (toolCount === 0) return null;
    return (
      <p className="reasoning-collapsed">
        {toolCount} {toolCount === 1 ? "инструмент" : "инструментов"}
      </p>
    );
  }

  return (
    <section ref={rootRef} className="reasoning-shell" data-motion={active ? "running" : "paused"} aria-busy={active}>
      <div className="reasoning-status" role="status" aria-live="polite" aria-atomic="true">
        {active ? (
          <span className="reasoning-equalizer" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : null}
        <span>{active ? (showCompleted ? "Рассуждение модели…" : "Подбираю музыку…") : "Рассуждение модели"}</span>
      </div>

      {lines.length > 0 && (
        <div
          ref={scrollRef}
          className="reasoning-transcript"
          style={{ maxHeight }}
          onScroll={handleScroll}
          aria-label="Ход подбора"
        >
          {lines.map((line, index) => {
            const current = index === lines.length - 1 && (line.state === "thinking" || line.state === "pending");
            return (
              <div
                key={line.key}
                className={`reasoning-line reasoning-line--${line.state}${current ? " is-current" : ""}`}
                style={{ paddingLeft: line.depth * 16 }}
              >
                <span className={`reasoning-dot ${MARKER_CLASS[line.marker] ?? ""}`} aria-hidden="true" />
                <span className="reasoning-text">
                  {line.segments.map((seg, i) => (
                    <span
                      key={i}
                      className={`${TONE_CLASS[seg.tone]}${seg.tone === "ok" || seg.tone === "error" ? " reasoning-result" : ""}`}
                    >
                      {seg.text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
