## Context

Mini App уже содержит пользовательские экраны, поиск, генерацию, покупки и
админскую поверхность. Telegram-боту нужен минимальный entrypoint: команда
`/start` с `web_app`-кнопкой и команда `/stats` для быстрого admin-only отчёта.

## Decisions

### Bot registration

`createBot` регистрирует только `/start`, `/stats` и два служебных payment update
handlers (`pre_checkout_query`, `message:successful_payment`). Allowlist middleware
остаётся перед командами. Group/inline updates, callback queries и обычные
текстовые сообщения не получают handlers.

`channelSubscriptionGate` отключается от bot pipeline: он сам отправляет и
обновляет inline-кнопки, что противоречит минимальному интерфейсу. Ограничение
доступа Mini App/API не меняется и продолжает проверяться на сервере.

### `/start` response

Для обычного запуска URL кнопки равен `PUBLIC_ORIGIN`. Для valid `pl_<token>` URL
получает `?share=<token>`, чтобы Mini App открыла shared playlist. Existing
attribution, referral crediting, user upsert and best-effort avatar capture remain
side effects of `/start` and do not add Telegram UI.

The response is a short Russian text plus one inline `web_app` button. The
persistent chat menu button is not configured anymore.

### `/stats`

The old admin panel is reduced to `getAdminStats(db, "all")` rendered as text. It
does not expose period callback buttons or `/admin`; the Mini App remains the place
for full admin settings and operations.

### Payments

Stars pre-checkout and successful-payment updates are not user navigation and are
kept for backwards compatibility with Mini App purchases. The successful-payment
confirmation remains a plain service message without a keyboard.

## Risks and compatibility

- Users relying on bot commands such as `/search`, `/buy` or `/admin` must use the
  corresponding Mini App screens instead.
- Existing deep links remain useful: referral/UTM/share attribution is recorded,
  and share links open the shared playlist in the Mini App.
- Existing bot feature files and their isolated unit tests may still exist, but
  they are unreachable from the production bot until explicitly registered.
