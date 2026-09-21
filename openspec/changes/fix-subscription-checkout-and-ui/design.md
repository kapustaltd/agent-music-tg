# Design: checkout sheet и content-first магазин

## Контекст

Mini App уже умеет создавать счёт через Telegram Stars и Platega/СБП. Важный
контракт — сначала выбрать срок, затем явно подтвердить способ оплаты. СБП
создаёт pending invoice до открытия внешней страницы, поэтому cancel должен
получать именно внутренний ID записи invoices.

## Решения

### D1. Последовательный checkout

Карточка срока остаётся единственным действием на витрине. `SubscriptionPaymentSheet`
показывает выбранный оффер, доступные методы и одну CTA. Метод появляется только
если у оффера есть соответствующая цена; выбор и CTA используют нативные
`button`, `role="radio"`, `aria-checked` и focus trap существующего `useDialog`.

### D2. Открытие внешней оплаты не должно ломать React

`openExternalUrl` сначала вызывает Telegram `openTelegramLink`/`openLink`, а
синхронное исключение неподдерживаемого клиента ловит и повторяет открытие через
`window.open`. Stars дополнительно пробует `openInvoice`, затем тот же fallback.

### D3. Корректная отмена Platega

`insertPendingInvoice` возвращает `lastInsertRowid`. `purchaseOfferRub`
передаёт его в `PurchaseResult.invoiceId`, API возвращает этот ID Mini App, а
`POST /api/invoices/:id/cancel` продолжает проверять владельца и provider перед
отменой.

### D4. Анти-slop слой

Витрина не использует повторяющиеся горизонтальные линии для группировки.
Карточки сроков получают минимальную рамку только как affordance и selected
state; modal sheet сохраняет один спокойный surface, понятную иерархию и
touch-target не менее 44px.

## Проверка

- `bun run typecheck`
- focused Bun tests для Telegram navigation и Platega/cancel
- `bun test`
- `bun run build:miniapp`
- ручной сценарий на узком viewport: открыть «Подписка», выбрать срок,
  выбрать СБП/Stars, закрыть sheet, повторно открыть и проверить CTA.
