import { useState } from "react";
import { ArrowUp, CaretRight } from "../icons";
import { GenerationStatus } from "../components/GenerationStatus";
import type { AgentProgressEvent } from "../lib/api";

export function ClarifyScreen({
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
  const [selected, setSelected] = useState<string | null>(null);

  const canSubmitCustom = !busy && custom.trim().length > 0;

  function submitAnswer(answer: string) {
    const value = answer.trim();
    if (busy || value.length === 0) return;
    setSelected(value);
    onAnswer(value);
  }

  function submitCustom() {
    if (!canSubmitCustom) return;
    submitAnswer(custom);
  }

  return (
    <section className="reveal clarify-page" aria-busy={busy}>
      <h1 className="screen-title">Какую музыку собрать?</h1>
      <p className="clarify-question">Выбери вариант или опиши свой</p>

      {busy && selected ? (
        <div className="clarify-selection" aria-label={`Выбранный вариант: ${selected}`}>
          <span className="clarify-selection-value">{selected}</span>
          <button
            type="button"
            className="clarify-selection-edit"
            aria-label="Изменить выбранный вариант"
            disabled
          >
            · Изменить
          </button>
        </div>
      ) : (
        <>
          <div className="clarify-option-list">
            {options.map((option) => (
              <button
                key={option}
                className="clarify-option"
                disabled={busy}
                onClick={() => submitAnswer(option)}
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
              placeholder="Или опиши свой вариант…"
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
        </>
      )}

      {busy && <GenerationStatus progress={progress} />}
    </section>
  );
}
