## Why

При запуске Mini App приложение автоматически разворачивается на весь доступный экран Telegram и блокирует свайп вниз. Такое поведение не нужно: пользователь должен сохранять стандартный размер Mini App и системные жесты Telegram.

## What Changes

- Убрать автоматический вызов `WebApp.expand()` при инициализации Mini App
- Убрать автоматические вызовы `WebApp.requestFullscreen()` и `WebApp.disableVerticalSwipes()`
- Сохранить вызов `WebApp.ready()` и остальную логику запуска без изменений
- Удалить ставшие ненужными типы и helper для управления fullscreen/свайпами

## Capabilities

### New Capabilities
- `miniapp-viewport` — запуск Mini App без принудительного изменения viewport и жестов Telegram

### Modified Capabilities
- *(нет)*

## Impact

- `miniapp/src/App.tsx` — инициализация Telegram WebApp больше не меняет размер окна и свайпы
- `miniapp/src/lib/telegram.ts` — удаление неиспользуемых fullscreen/viewport API из локального интерфейса и helper
- `openspec/changes/disable-miniapp-fullscreen/` — спецификация, дизайн и план проверки изменения
