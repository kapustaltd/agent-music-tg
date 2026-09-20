import type { Invoice, Offer } from "./api";

function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const absolute = Math.abs(n);
  const mod10 = absolute % 10;
  const mod100 = absolute % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** A human-readable product name for both the shop and account history. */
export function purchaseLabel(invoice: Invoice, offers: Offer[]): string {
  const offer = offers.find((candidate) => candidate.id === invoice.offerId);
  if (offer?.title.trim()) return offer.title.trim();
  if (offer) {
    return offer.grantKind === "subscription"
      ? `${offer.grantAmount} ${pluralRu(offer.grantAmount, ["день", "дня", "дней"])} подписки`
      : `${offer.grantAmount} ${pluralRu(offer.grantAmount, ["генерация", "генерации", "генераций"])}`;
  }
  return "Покупка";
}

export function purchasePrice(invoice: Invoice): string {
  if (invoice.asset === "XTR") return `${invoice.amount} звёзд Telegram`;
  if (invoice.asset === "RUB") return `${invoice.amount} ₽`;
  return `${invoice.amount} ${invoice.asset}`;
}

export function purchaseTimestamp(invoice: Invoice): number {
  return invoice.paidAt ?? invoice.createdAt;
}
