import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Bank, ArrowSquareOut } from "../icons";
import { openPayUrl, openSupport } from "../lib/telegram";
import { useDialog } from "../lib/useDialog";

interface SbpPayPopupProps {
  payUrl: string;
  offerTitle: string;
  supportContact: string;
  onClose: (cancelled: boolean) => void;
}

/**
 * СБП payment sheet. Sits just above the bottom dock (z-index above the dock)
 * so the user can read it without the nav covering it. Tapping the backdrop or
 * «Закрыть» rolls the held credits back via onClose(true); the successful
 * completion path is handled by the parent polling the purchase list.
 */
export function SbpPayPopup({ payUrl, offerTitle, supportContact, onClose }: SbpPayPopupProps) {
  const [openError, setOpenError] = useState(false);
  const cardRef = useDialog<HTMLDivElement>(true, () => onClose(true));

  function handlePay() {
    setOpenError(!openPayUrl(payUrl));
  }

  return createPortal(
    (
    <div
      className="sbp-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(true);
      }}
    >
      <div className="sbp-sheet" ref={cardRef} role="dialog" aria-modal="true" aria-label="Оплата через СБП">
        <div className="sbp-sheet-head">
          <span className="sbp-sheet-title">
            <Bank size={18} weight="bold" aria-hidden="true" /> Оплата через СБП
          </span>
          <button
            type="button"
            className="sbp-close"
            aria-label="Закрыть"
            onClick={() => onClose(true)}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <p className="sbp-sheet-body">
          Нажмите на оплатить чтобы получить <strong>{offerTitle}</strong> через оплату СБП.
          После оплаты доступ к подписке/генерациям появится автоматически.
        </p>

        <button
          type="button"
          className="glass-button primary sbp-pay-btn"
          onClick={handlePay}
        >
          <ArrowSquareOut size={16} weight="bold" aria-hidden="true" /> Оплатить
        </button>
        {openError && (
          <p className="sbp-sheet-error" role="alert">
            Не удалось открыть оплату. Попробуйте ещё раз.
          </p>
        )}
        {supportContact && (
          <button
            type="button"
            className="sbp-support"
            onClick={() => openSupport(supportContact)}
          >
            Нужна помощь?
          </button>
        )}
      </div>
    </div>
    ),
    document.body,
  );
}
