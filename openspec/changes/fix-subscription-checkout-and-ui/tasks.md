# Tasks: fix-subscription-checkout-and-ui

## Checkout и платежи

- [x] 1.1 Вынести выбор способа оплаты в modal sheet после выбора срока.
- [x] 1.2 Перевести CTA СБП с перехватываемой ссылки на нативную кнопку с
      обработкой ошибки открытия.
- [x] 1.3 Добавить fallback открытия ссылок для старых Telegram WebView.
- [x] 1.4 Возвращать внутренний ID Platega invoice и использовать его при cancel.

## UI

- [x] 2.1 Удалить повторяющие описания сроков из заголовка магазина.
- [x] 2.2 Убрать декоративные горизонтальные полосы в новом checkout flow.
- [x] 2.3 Сохранить dark/light, keyboard focus, Escape и touch targets.

## Проверка

- [x] 3.1 Добавить/обновить OpenSpec-документацию.
- [x] 3.2 `bun run typecheck`.
- [x] 3.3 Focused тесты Telegram/Platega/cancel.
- [x] 3.4 `bun test`.
- [x] 3.5 `bun run build:miniapp`.
- [ ] 3.6 Ручная проверка в Telegram WebView.
