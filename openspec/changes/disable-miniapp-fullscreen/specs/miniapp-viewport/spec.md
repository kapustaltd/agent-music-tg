## ADDED Requirements

### Requirement: Не разворачивать Mini App автоматически

При инициализации Mini App приложение SHALL вызвать `Telegram.WebApp.ready()`, но SHALL NOT автоматически вызывать методы, меняющие размер viewport или системные жесты: `expand()`, `requestFullscreen()` и `disableVerticalSwipes()`.

#### Scenario: Открытие Mini App в Telegram

- **WHEN** Mini App монтируется в Telegram WebView
- **THEN** вызывается `Telegram.WebApp.ready()`
- **AND** `Telegram.WebApp.expand()` не вызывается
- **AND** `Telegram.WebApp.requestFullscreen()` не вызывается
- **AND** `Telegram.WebApp.disableVerticalSwipes()` не вызывается

#### Scenario: Запуск вне Telegram

- **WHEN** Mini App монтируется без `Telegram.WebApp`
- **THEN** приложение продолжает запускаться без попытки вызвать Telegram viewport API
- **AND** инициализация не приводит к ошибке из-за отсутствия Telegram SDK

#### Scenario: Внутренний полноэкранный плеер

- **WHEN** пользователь открывает полноэкранный экран плеера
- **THEN** внутреннее состояние и layout плеера работают как раньше
- **AND** это не вызывает автоматический fullscreen Telegram WebApp
