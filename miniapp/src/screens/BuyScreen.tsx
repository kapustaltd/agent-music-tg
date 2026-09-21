import { useEffect, useMemo, useRef, useState } from "react";
import { CircleNotch, Check, CreditCard, Gift, Star } from "../icons";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { InlineNotice } from "../components/InlineNotice";
import { Segmented } from "../components/Segmented";
import { TrackSkeleton } from "../components/TrackSkeleton";
import { SbpPayPopup } from "../components/SbpPayPopup";
import { api, type Offer, type Invoice, type PaymentMethod, type TrialStatus } from "../lib/api";
import { openPayUrl, openStarsInvoice, openSupport } from "../lib/telegram";
import { purchaseLabel, purchasePrice, purchaseTimestamp } from "../lib/purchase";

const SUBSCRIPTION_DAYS = [30, 90, 180] as const;
const PAYMENT_METHODS = ["platega", "stars"] as const satisfies readonly PaymentMethod[];
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  platega: "СБП",
  stars: "Звёзды Telegram",
};

function planLabel(days: number): string {
  if (days === 30) return "1 месяц";
  if (days === 90) return "3 месяца";
  if (days === 180) return "6 месяцев";
  return `${days} дней`;
}

function isSubscriptionPlan(days: number): boolean {
  return SUBSCRIPTION_DAYS.includes(days as (typeof SUBSCRIPTION_DAYS)[number]);
}

function subscriptionDate(until: number): string {
  return new Date(until * 1000).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function planPriceLabel(o: Offer): string {
  const prices = [
    o.rubAmount ? `${o.rubAmount} ₽` : null,
    o.starsAmount ? `${o.starsAmount} звёзд Telegram` : null,
  ].filter((price): price is string => price !== null);
  return prices.join(" · ") || "Оплата недоступна";
}

export default function BuyScreen({ reason }: { reason?: string }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([]);
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [subscriptionUntil, setSubscriptionUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("platega");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [trialBusy, setTrialBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [offerErrors, setOfferErrors] = useState<Record<number, string>>({});
  const [supportContact, setSupportContact] = useState<string>("");
  const [sbpInvoice, setSbpInvoice] = useState<{ id: number; payUrl: string; offerTitle: string } | null>(null);

  // null until the first fetch lands, so pre-existing purchases
  // don't fire the "payment received" toast on mount.
  const prevCountRef = useRef<number | null>(null);

  const refresh = () =>
    Promise.all([api.offers(), api.purchases(), api.me(), api.shopConfig()])
      .then(([o, p, me, cfg]) => {
        setOffers(o.offers);
        setSupportContact(cfg.supportContact ?? "");
        setTrial(me.trial);
        setSubscriptionUntil(me.subscriptionUntil);
        const paid = p.purchases.filter((i) => i.status === "paid");
        setPaidInvoices(paid);
        if (prevCountRef.current !== null && paid.length > prevCountRef.current) {
          setShowSuccess(true);
          window.setTimeout(() => setShowSuccess(false), 2500);
          // Purchase landed — refresh the header wallet chip without a reload.
          window.dispatchEvent(new CustomEvent("balance-changed"));
        }
        prevCountRef.current = paid.length;
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The Mini App sells only the three supported subscription periods. Credit
  // packs and legacy subscription durations remain available to the bot/admin
  // flows, but never appear in this shop.
  const visible = useMemo(() => {
    return (offers ?? [])
      .filter((o) => o.grantKind === "subscription" && isSubscriptionPlan(o.grantAmount))
      .sort((a, b) => a.grantAmount - b.grantAmount);
  }, [offers]);

  const selected = visible.find((offer) => offer.id === selectedId && (offer.rubAmount || offer.starsAmount)) ?? visible.find((offer) => offer.rubAmount || offer.starsAmount);
  const selectedMethod: PaymentMethod = selected
    ? method === "platega" && selected.rubAmount
      ? "platega"
      : selected.starsAmount
        ? "stars"
        : "platega"
    : "stars";
  const paymentOptions = selected
    ? PAYMENT_METHODS.filter((paymentMethod) => paymentMethod === "platega" ? Boolean(selected.rubAmount) : Boolean(selected.starsAmount))
    : [];
  const selectedPrice = selectedMethod === "platega" ? `${selected?.rubAmount ?? "—"} ₽` : `${selected?.starsAmount ?? "—"} звёзд Telegram`;
  const hasActiveSubscription = subscriptionUntil !== null && subscriptionUntil * 1000 > Date.now();

  async function buy(offerId: number, method: PaymentMethod = "stars") {
    setBusyId(offerId);
    setError(null);
    try {
      const result = await api.createInvoice(offerId, method);
      if (!result.payUrl) return;
      if (method === "stars") {
        openStarsInvoice(result.payUrl, (status) => {
          if (status !== "paid") return;
          // Fulfillment lands via the bot's successful_payment handler a moment
          // after the sheet closes — retry so history/balance catch the grant.
          void refresh();
          window.setTimeout(() => void refresh(), 1500);
          window.setTimeout(() => void refresh(), 4000);
        });
      } else if (method === "platega") {
        // СБП pays in an external bank app; show the sheet above the dock and
        // poll for the webhook-driven grant while it is open.
        setSbpInvoice({ id: result.id, payUrl: result.payUrl, offerTitle: result.offerTitle });
        window.setTimeout(() => void refresh(), 3000);
        window.setTimeout(() => void refresh(), 8000);
        window.setTimeout(() => void refresh(), 15000);
      } else {
        openPayUrl(result.payUrl);
        // Crypto payment happens outside the app (bot chat / browser); poll
        // for the webhook-driven grant so balance/history catch up without
        // requiring the user to manually leave and re-enter the screen.
        window.setTimeout(() => void refresh(), 3000);
        window.setTimeout(() => void refresh(), 8000);
        window.setTimeout(() => void refresh(), 15000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOfferErrors((prev) => ({ ...prev, [offerId]: msg }));
    } finally {
      setBusyId(null);
    }
  }

  function clearOfferError(offerId: number) {
    setOfferErrors((prev) => {
      const next = { ...prev };
      delete next[offerId];
      return next;
    });
  }

  async function handleSbpClose(cancelled: boolean) {
    const inv = sbpInvoice;
    setSbpInvoice(null);
    if (cancelled && inv) {
      // Roll the held credits back if the user bailed before paying.
      try {
        await api.cancelInvoice(inv.id);
      } catch {
        /* ignore — the invoice still expires server-side */
      }
      void refresh();
      window.dispatchEvent(new CustomEvent("balance-changed"));
    }
  }

  async function claimTrial() {
    setTrialBusy(true);
    setError(null);
    try {
      const result = await api.claimTrial();
      setTrial(result.trial);
      setTrialSuccess(true);
      void refresh();
      window.setTimeout(() => setTrialSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      void refresh();
    } finally {
      setTrialBusy(false);
    }
  }

  if (error && !offers) return <ErrorBanner message={error} onClose={() => setError(null)} onRetry={refresh} />;

  return (
    <div className="stack subscription-page">
      <header className="subscription-header reveal">
        <div className="subscription-heading">
          <h1 className="screen-title">Подписка</h1>
          <p>Выбери срок и способ оплаты.</p>
        </div>
        <div className={`subscription-status${hasActiveSubscription ? " is-active" : ""}`}>
          <span>{hasActiveSubscription ? "Активна до" : "Доступ по подписке"}</span>
          <strong>{hasActiveSubscription && subscriptionUntil ? subscriptionDate(subscriptionUntil) : "1, 3 или 6 месяцев"}</strong>
        </div>
      </header>

      {reason && (
        <p className="subscription-notice" role="status"><CreditCard size={18} weight="bold" /> {reason}</p>
      )}

      {showSuccess && (
        <div className="status-card status-card--success" role="status">
          <span className="status-icon status-icon--success">
            <Check size={20} weight="bold" />
          </span>
          <span>Платёж получен, доступ активирован.</span>
        </div>
      )}

      {trialSuccess && (
        <p className="subscription-notice" role="status"><Gift size={18} weight="bold" /> Бесплатный пакет активирован: 10 генераций на 3 дня.</p>
      )}

      {trial && !trial.claimed && (
        <section className="reveal trial-card">
          <div className="trial-card-row">
            <span className="trial-card-info">
              <span className="trial-card-title"><Gift size={16} weight="bold" /> Пробный доступ</span>
              <span className="trial-card-label">10 генераций на 3 дня</span>
            </span>
            <button
              type="button"
              className="glass-button trial-card-btn"
              disabled={trialBusy}
              onClick={() => void claimTrial()}
            >
              Попробовать
            </button>
          </div>
        </section>
      )}

      <section className="reveal subscription-offers">
        {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
        {offers === null ? (
          <TrackSkeleton rows={3} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} weight="bold" />} label="Подписки пока недоступны" />
        ) : (
          <div className="stack reveal-stagger">
            <div className="subscription-section-heading">
              <h2>Выбери срок</h2>
              <span>{visible.length} варианта</span>
            </div>
            <div className="subscription-plans" role="group" aria-label="Срок подписки">
              {visible.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className={`subscription-plan${selected?.id === o.id ? " is-selected" : ""}`}
                  aria-pressed={selected?.id === o.id}
                  disabled={busyId !== null || (!o.rubAmount && !o.starsAmount)}
                  onClick={() => setSelectedId(o.id)}
                >
                  <span className="subscription-plan-duration">{planLabel(o.grantAmount)}</span>
                  <span className="subscription-plan-days">{o.grantAmount} дней доступа</span>
                  <span className="subscription-plan-prices">{planPriceLabel(o)}</span>
                  <span className="subscription-plan-check" aria-hidden="true">
                    {selected?.id === o.id ? <Check size={18} weight="bold" /> : null}
                  </span>
                </button>
              ))}
            </div>
            {selected && <div className="subscription-checkout">
              <div className="subscription-checkout-heading">
                <span>Способ оплаты</span>
                <strong>{planLabel(selected.grantAmount)}</strong>
              </div>
              {paymentOptions.length > 1 ? (
                <Segmented<PaymentMethod>
                  ariaLabel="Способ оплаты"
                  role="radiogroup"
                  fill
                  options={paymentOptions}
                  labels={PAYMENT_METHOD_LABELS}
                  value={selectedMethod}
                  onChange={setMethod}
                />
              ) : (
                <p className="subscription-method-single">Доступно: {PAYMENT_METHOD_LABELS[selectedMethod]}</p>
              )}
              <button type="button" className="glass-button primary subscription-buy" disabled={busyId !== null} aria-busy={busyId !== null} onClick={() => void buy(selected.id, selectedMethod)}>
                {busyId !== null && <CircleNotch size={20} className="spin" aria-hidden="true" />}
                {busyId !== null ? "Открываю оплату…" : `Оплатить ${selectedPrice}`}
              </button>
              <p className="subscription-checkout-note">Доступ активируется после подтверждения оплаты.</p>
              {offerErrors[selected.id] && <InlineNotice message={offerErrors[selected.id]!} onDismiss={() => clearOfferError(selected.id)} onOtherOption={() => clearOfferError(selected.id)} onSupport={supportContact ? () => openSupport(supportContact) : undefined} supportContact={supportContact} />}
            </div>}
          </div>
        )}
      </section>

      {paidInvoices.length > 0 && (
        <section className="reveal subscription-history">
          <h2 className="screen-title">История оплат</h2>
          <ul className="plain-list purchase-list">
            {paidInvoices.map((p) => (
              <li key={p.id} className="purchase-history-row">
                <span className="purchase-history-copy">
                  <strong>{purchaseLabel(p, visible)}</strong>
                  <time dateTime={new Date(purchaseTimestamp(p) * 1000).toISOString()}>
                    {new Date(purchaseTimestamp(p) * 1000).toLocaleDateString("ru-RU")}
                  </time>
                </span>
                <span className="purchase-history-price">
                  {purchasePrice(p)} {p.asset === "XTR" && <Star size={14} weight="fill" aria-hidden="true" />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sbpInvoice && (
        <SbpPayPopup
          payUrl={sbpInvoice.payUrl}
          offerTitle={sbpInvoice.offerTitle}
          supportContact={supportContact}
          onClose={handleSbpClose}
        />
      )}
    </div>
  );
}
