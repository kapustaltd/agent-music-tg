# Minimal Telegram entrypoint Specification

## Requirements

### Requirement: `/start` opens the Mini App

The bot SHALL respond to `/start` for an allowlisted chat with one message that
contains exactly one `web_app` button pointing to `PUBLIC_ORIGIN`. It SHALL NOT add
an inline navigation menu or persistent chat-menu button.

#### Scenario: regular start

- **WHEN** an allowlisted user sends `/start`
- **THEN** the bot sends one message with one Mini App button
- **AND** no other bot menu or navigation buttons are sent

#### Scenario: shared-playlist start

- **WHEN** an allowlisted user sends `/start pl_<valid-token>`
- **THEN** the bot records the existing share/referral side effects
- **AND** the single Mini App button opens `PUBLIC_ORIGIN` with `share=<token>`

### Requirement: only `/stats` remains for admins

The bot SHALL expose `/stats` as the only administrative command. It SHALL return
the all-time admin statistics as plain text only when `ctx.isAdmin` is true, and
SHALL NOT attach inline buttons.

#### Scenario: admin stats

- **WHEN** an admin sends `/stats`
- **THEN** the bot replies with the all-time statistics text without a keyboard

#### Scenario: regular user stats

- **WHEN** a non-admin allowlisted user sends `/stats`
- **THEN** the bot sends no response

### Requirement: legacy Telegram interactions are ignored

The bot SHALL not register handlers for legacy user commands, callback menus,
inline queries, group keyword search, or unarmed plain text messages.

#### Scenario: legacy interaction

- **WHEN** a user sends a legacy command, callback query, inline query, group text,
  or ordinary private text
- **THEN** the bot sends no user-facing response

### Requirement: Mini App payments remain operational

The bot SHALL continue to process Telegram Stars pre-checkout and successful
payment updates initiated by the Mini App, without adding navigation keyboards.
