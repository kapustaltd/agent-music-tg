import { Bank, Check, CircleNotch, CreditCard, Star, X } from "../icons";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Offer, PaymentMethod } from "../lib/api";
import { useDialog } from "../lib/useDialog";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  platega: "СБП",
  stars: "Звёзды Telegram",
};

function priceLabel(offer: Offer, method: PaymentMethod): string {
  return method === "platega"
    ? `${offer.rubAmount ?? "—"} ₽`
    : `${offer.starsAmount ?? "—"} звёзд`;
}

function methodDescription(offer: Offer, method: PaymentMethod): string {
  return method === "platega"
    ? `${offer.rubAmount ?? "—"} ₽ · откроется банковская страница`
    : `${offer.starsAmount ?? "—"} звёзд · оплата в Telegram`;
}

function methodIcon(method: PaymentMethod) {
  return method === "platega"
    ? <Bank size={20} weight="bold" aria-hidden="true" />
    : <Star size={20} weight="fill" aria-hidden="true" />;
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
                className={`payment-method-option${selected ? " is-selected" : ""}`}
                disabled={busy}
                onClick={() => onMethodChange(option)}
              >
                <span className="payment-method-option-icon">{methodIcon(option)}</span>
                <span className="payment-method-option-copy">
                  <strong>{METHOD_LABELS[option]}</strong>
                  <small>{methodDescription(offer, option)}</small>
                </span>
                <span className="payment-method-option-price">{priceLabel(offer, option)}</span>
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
