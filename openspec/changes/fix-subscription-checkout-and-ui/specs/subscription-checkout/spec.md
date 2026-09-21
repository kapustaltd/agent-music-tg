# subscription-checkout Specification

## ADDED Requirements

### Requirement: Payment method is selected in a modal sheet

The Mini App SHALL open a modal payment-method sheet after a user selects an
available subscription period. The sheet SHALL show only methods backed by the
selected offer's prices and SHALL create an invoice only after an explicit CTA.

#### Scenario: Dual-priced subscription

- **WHEN** a user selects an offer with RUB and Stars prices
- **THEN** the sheet shows СБП and Telegram Stars as selectable methods
- **AND** the invoice is created only after the user presses «Оплатить»

#### Scenario: Single-priced subscription

- **WHEN** a user selects an offer with only one supported price
- **THEN** the sheet shows only that payment method
- **AND** the CTA uses that method

### Requirement: External payment actions remain operable

Payment and support actions SHALL use Telegram link APIs when available and
SHALL fall back to a browser URL when the Telegram client rejects the API call.
The SБП payment action SHALL remain a native button with an actionable error
state when no opener succeeds.

#### Scenario: Unsupported Telegram WebView method

- **WHEN** Telegram exposes an external-link method but rejects it at runtime
- **THEN** the Mini App catches the exception and attempts the browser fallback
- **AND** the React screen remains mounted

### Requirement: Platega cancellation targets the created invoice

The Platega checkout response SHALL include the internal pending invoice ID
created for that transaction.

#### Scenario: User closes an unpaid СБП sheet

- **WHEN** the user closes the sheet before payment confirmation
- **THEN** the Mini App calls cancel with the created invoice ID
- **AND** the pending invoice is canceled idempotently

### Requirement: Subscription copy is concise

The shop SHALL not render the redundant «Выбери срок и способ оплаты» subtitle
or the separate «Доступ по подписке 1, 3 или 6 месяцев» status block. Repeated
horizontal rules SHALL not be used as the primary grouping mechanism in the
subscription checkout flow.

#### Scenario: Subscription shop is rendered

- **WHEN** the shop has available subscription offers
- **THEN** the user sees a concise title, plan choices, and the modal-based
  payment flow without the removed copy or decorative rule stack
