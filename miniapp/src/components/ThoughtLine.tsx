import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SparklesIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import "../styles/thought-line.css";

/** A compact, Russian adaptation of the supplied React Bits ThoughtLine. */
export function ThoughtLine({ steps, label = "Подбираю музыку…" }: { steps: string[]; label?: string }) {
  const [open, setOpen] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const started = performance.now();
    const timer = window.setInterval(() => setSeconds((performance.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, []);

  const hasSteps = steps.length > 0;
  return (
    <div className="thought-line">
      <button
        type="button"
        className="thought-line__head"
        disabled={!hasSteps}
        aria-expanded={hasSteps ? open : undefined}
        aria-controls="generation-thought-steps"
        onClick={() => setOpen((value) => !value)}
      >
        <motion.span
          className="thought-line__glyph"
          aria-hidden="true"
          animate={reducedMotion ? undefined : { opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <HugeiconsIcon icon={SparklesIcon} size={19} strokeWidth={2} />
        </motion.span>
        <span className="thought-line__label">{label}</span>
        <span className="thought-line__timer" aria-hidden="true">{seconds.toFixed(1)} с</span>
        {hasSteps && <span className={`thought-line__chevron${open ? " is-open" : ""}`} aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
        </span>}
      </button>
      {hasSteps && <div id="generation-thought-steps" className="thought-line__steps" hidden={!open}>
        {steps.map((step, index) => <div className="thought-line__step" key={`${index}-${step}`}>
          <span className="thought-line__mark" aria-hidden="true">
            {index < steps.length - 1 ? <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} /> : <span className="thought-line__pulse" />}
          </span>
          <span>{step}</span>
        </div>)}
      </div>}
    </div>
  );
}
