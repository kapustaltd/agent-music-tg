# subscription-shop Specification

## ADDED Requirements

### Requirement: Subscription periods are limited

The Mini App shop SHALL show only active subscription offers granting exactly 30,
90, or 180 days, represented as 1, 3, or 6 months. Credit offers and other
subscription durations SHALL not be rendered in the Mini App shop.

#### Scenario: Supported plans are configured

- **WHEN** active offers include 30, 90, and 180 day subscriptions
- **THEN** the shop shows them in ascending order as 1, 3, and 6 months

#### Scenario: Unsupported offer exists

- **WHEN** an active offer grants credits or a non-standard subscription duration
- **THEN** that offer is absent from the Mini App plan selector

### Requirement: Payment methods follow offer availability

The selected subscription plan SHALL expose Platega/СБП when it has a RUB price
and Telegram Stars when it has a Stars price. The checkout CTA SHALL create an
invoice only after an explicit user activation.

#### Scenario: Dual-priced plan

- **WHEN** the selected plan has both `rubAmount` and `starsAmount`
- **THEN** the user can switch between СБП and Telegram Stars before pressing
  the payment CTA

#### Scenario: Single-priced plan

- **WHEN** the selected plan has only one supported price
- **THEN** the unavailable method is hidden and the CTA uses the available method

### Requirement: Existing payment fulfillment is preserved

The shop SHALL continue to use the existing Stars invoice callback and Platega
popup/polling flow, including success refresh, cancellation handling, and
payment history updates.

#### Scenario: Stars payment succeeds

- **WHEN** Telegram reports a paid Stars invoice
- **THEN** the shop refreshes the subscription/history state and shows the
  existing success feedback

#### Scenario: Platega payment is cancelled

- **WHEN** the user closes the Platega payment popup before payment
- **THEN** the existing cancellation path is called and the shop refreshes

### Requirement: Subscription status is visible

The shop SHALL show whether the user has an active subscription and its expiry
date when available, without hiding the plan selector or purchase history.

#### Scenario: Active subscription

- **WHEN** `/api/me` returns a future `subscriptionUntil`
- **THEN** the shop displays that the subscription is active and its localized
  expiry date
