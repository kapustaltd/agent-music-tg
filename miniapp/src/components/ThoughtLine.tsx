import { useEffect, useState } from "react";
import "../styles/thought-line.css";

export function ThoughtLine({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => setSeconds((performance.now() - startedAt) / 1000), 100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="thought-line">
      <button
        type="button"
        className="thought-line__head"
        aria-expanded={open}
        aria-controls="generation-thought-steps"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="thought-line__label">Подбираю музыку…</span>
        <span className="thought-line__timer" aria-hidden="true">{seconds.toFixed(1)} с</span>
        <span className={`thought-line__chevron${open ? " is-open" : ""}`} aria-hidden="true">⌄</span>
      </button>
      <div id="generation-thought-steps" className="thought-line__steps" hidden={!open}>
        {steps.map((step, index) => (
          <div className="thought-line__step" key={`${index}-${step}`}>
            <span className="thought-line__mark" aria-hidden="true">{index < steps.length - 1 ? "✓" : "·"}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
