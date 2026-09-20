import { useState } from "react";
import { ArrowUp, CaretRight } from "../icons";
import { GenerationStatus } from "../components/GenerationStatus";
import type { AgentProgressEvent } from "../lib/api";

export function ClarifyScreen({
  question,
  options,
  onAnswer,
  busy,
  progress,
}: {
  question: string;
  options: string[];
  onAnswer: (answer: string) => void;
  busy: boolean;
  progress: AgentProgressEvent[];
}) {
  const [custom, setCustom] = useState("");

  const canSubmitCustom = !busy && custom.trim().length > 0;

  function submitCustom() {
    if (!canSubmitCustom) return;
    onAnswer(custom.trim());
  }

  return (
    <section className="reveal clarify-page" aria-busy={busy}>
      <h1 className="screen-title">Какой плейлист собрать?</h1>
      <p className="clarify-question">{question}</p>
      <div className="stack">
        {options.map((option) => (
          <button
            key={option}
            className="clarify-option"
            disabled={busy}
            onClick={() => onAnswer(option)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
          >
            <span>{option}</span>
            <CaretRight size={18} weight="bold" className="chevron" />
          </button>
        ))}
      </div>

      <div className="prompt-pill clarify-own">
        <textarea
          className="prompt-pill-input"
          rows={1}
          placeholder="Или напишите свой вариант…"
          aria-label="Свой вариант ответа"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitCustom();
            }
          }}
          disabled={busy}
        />
        <button
          type="button"
          className="prompt-submit"
          aria-label="Отправить свой вариант"
          disabled={!canSubmitCustom}
          onClick={submitCustom}
        >
          <ArrowUp size={20} weight="bold" />
        </button>
      </div>

      {busy && <GenerationStatus progress={progress} />}
    </section>
  );
}
