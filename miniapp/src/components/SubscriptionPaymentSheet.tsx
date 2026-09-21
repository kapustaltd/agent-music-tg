import { Check, CircleNotch, CreditCard, Star, X } from "../icons";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Offer, PaymentMethod } from "../lib/api";
import { useDialog } from "../lib/useDialog";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  platega: "СБП",
  stars: "Звёзды",
};

function priceLabel(offer: Offer, method: PaymentMethod): string {
  return method === "platega"
    ? `${offer.rubAmount ?? "—"} ₽`
    : `${offer.starsAmount ?? "—"} звёзд`;
}

function methodDescription(offer: Offer, method: PaymentMethod): string {
  return method === "platega"
    ? `От ${offer.rubAmount ?? "—"} ₽`
    : "1 звезда = 1 ₽";
}

function PaymentMethodArtwork({ method }: { method: PaymentMethod }) {
  if (method === "platega") {
    return (
      <span className="payment-method-art payment-method-art--sbp" aria-hidden="true">
        <span className="payment-art-bank payment-art-bank--green">С</span>
        <span className="payment-art-bank payment-art-bank--yellow">T</span>
        <span className="payment-art-bank payment-art-bank--red">A</span>
        <span className="payment-art-bank payment-art-bank--blue">ВТБ</span>
      </span>
    );
  }

  return (
    <span className="payment-method-art payment-method-art--stars" aria-hidden="true">
      <Star className="payment-art-star" size={148} weight="fill" />
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
            <p className="payment-method-kicker">Подписка</p>
            <h2 id="payment-method-title">{offer.title || `${offer.grantAmount} дней доступа`}</h2>
          </div>
          <button type="button" className="payment-method-close" aria-label="Закрыть" onClick={onClose}>
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="payment-method-summary">
          <span>{offer.grantAmount === 30 ? "1 месяц" : offer.grantAmount === 90 ? "3 месяца" : "6 месяцев"}</span>
          <strong>Выберите способ оплаты</strong>
        </div>

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
                  <small>{methodDescription(offer, option)}</small>
                </span>
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
