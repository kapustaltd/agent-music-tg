import { Check, CircleNotch, CreditCard, X } from "../icons";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Offer, PaymentMethod } from "../lib/api";
import { useDialog } from "../lib/useDialog";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  platega: "СБП",
  stars: "Звёзды",
};

const METHOD_ARTWORK: Record<PaymentMethod, string> = {
  platega: "/payment-spb-icon.webp",
  stars: "/payment-stars-icon.webp",
};

function durationLabel(days: number): string {
  if (days === 30) return "30 дней";
  if (days === 90) return "90 дней";
  if (days === 180) return "180 дней";
  return `${days} дней`;
}

function starsLabel(amount: number): string {
  return `${amount} ${amount === 1 ? "звезда" : "звёзд"}`;
}

function priceLabel(offer: Offer, method: PaymentMethod): string {
  return method === "platega"
    ? `${offer.rubAmount ?? "—"} ₽`
    : starsLabel(offer.starsAmount ?? 0);
}

function methodDescription(method: PaymentMethod): string {
  return method === "platega"
    ? "Через банковское приложение"
    : "Встроенная оплата Telegram";
}

function PaymentMethodArtwork({ method }: { method: PaymentMethod }) {
  return (
    <span className={`payment-method-art payment-method-art--${method}`} aria-hidden="true">
      <img src={METHOD_ARTWORK[method]} alt="" draggable="false" />
    </span>
  );
}

export function SubscriptionPaymentSheet({
  offer,
  methods,
  method,
  busy,
  error,
  onMethodChange,
  onPay,
  onClose,
  onDismissError,
}: {
  offer: Offer;
  methods: readonly PaymentMethod[];
  method: PaymentMethod;
  busy: boolean;
  error?: ReactNode;
  onMethodChange: (method: PaymentMethod) => void;
  onPay: () => void;
  onClose: () => void;
  onDismissError?: () => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(true, onClose);

  return createPortal(
    (
    <div
      className="payment-method-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="payment-method-sheet" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="payment-method-title">
        <div className="payment-method-head">
          <div>
            <h2 id="payment-method-title">Оплата</h2>
            <p className="payment-method-term">{durationLabel(offer.grantAmount)} доступа</p>
          </div>
          <button type="button" className="payment-method-close" aria-label="Закрыть" onClick={onClose}>
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="payment-method-summary">
          <span>Срок</span>
          <strong>{durationLabel(offer.grantAmount)} доступа</strong>
        </div>

        <h3 className="payment-method-section-title">Способ оплаты</h3>

        <div className="payment-method-options" role="radiogroup" aria-label="Способ оплаты">
          {methods.map((option) => {
            const selected = option === method;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`payment-method-option payment-method-option--${option}${selected ? " is-selected" : ""}`}
                disabled={busy}
                onClick={() => onMethodChange(option)}
              >
                <PaymentMethodArtwork method={option} />
                <span className="payment-method-option-copy">
                  <strong>{METHOD_LABELS[option]}</strong>
                  <small>{methodDescription(option)}</small>
                </span>
                <strong className="payment-method-option-price">{priceLabel(offer, option)}</strong>
                <span className="payment-method-option-check" aria-hidden="true">
                  {selected ? <Check size={18} weight="bold" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="payment-method-error" role="alert">
            <CreditCard size={16} weight="bold" aria-hidden="true" />
            <span>{error}</span>
            {onDismissError && (
              <button type="button" onClick={onDismissError}>Скрыть</button>
            )}
          </div>
        )}

        <div className="payment-method-total">
          <span>Итого</span>
          <strong>{priceLabel(offer, method)}</strong>
        </div>

        <button
          type="button"
          className="glass-button primary payment-method-submit"
          disabled={busy}
          aria-busy={busy}
          onClick={onPay}
        >
          {busy && <CircleNotch size={18} className="spin" aria-hidden="true" />}
          {busy ? "Открываю оплату…" : `Оплатить ${priceLabel(offer, method)}`}
        </button>
      </div>
    </div>
    ),
    document.body,
  );
}
