import { useEffect, useState } from "react";
import { X, WarningCircle, ArrowsClockwise } from "@phosphor-icons/react";
import { humanizeError } from "../lib/errorText";

export function ErrorBanner({
  message,
  onClose,
  onRetry,
}: {
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const friendly = humanizeError(message);
  const [visible, setVisible] = useState(true);

  // New error: reset state. Error toasts stay up until the user dismisses
  // them or retries, so an actionable failure is not lost mid-read.
  useEffect(() => {
    setVisible(true);
  }, [message]);

  if (!visible) return null;

  return (
    <div className="error-toast" role="alert" aria-live="assertive">
      <div className="error-toast-main">
        <WarningCircle size={18} weight="bold" className="error-toast-icon" aria-hidden="true" />
        <p className="error-toast-text">{friendly.message}</p>
        <button
          type="button"
          className="error-toast-close"
          aria-label="Закрыть"
          onClick={() => {
            setVisible(false);
            onClose();
          }}
        >
          <X size={16} />
        </button>
      </div>

      {onRetry && (
        <div className="error-toast-actions">
          <button type="button" className="error-toast-action" onClick={onRetry}>
            <ArrowsClockwise size={14} weight="bold" /> Повторить
          </button>
        </div>
      )}
    </div>
  );
}
