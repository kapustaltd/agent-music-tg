# Tasks: refresh-subscription-shop-and-prompt

## 1. Prompt composer

- [x] 1.1 Удалить заголовок «Что хочется послушать?» из разметки.
- [x] 1.2 Подключить общий `Segmented` для режимов «Подобрать / Поиск».
- [x] 1.3 Сделать prompt field edge-to-edge только на мобильной ширине.
- [x] 1.4 Сохранить автофокус поиска, auto-grow, Enter-submit и validation state.

## 2. Subscription shop

- [x] 2.1 Отфильтровать Mini App-витрину до подписок на 30/90/180 дней.
- [x] 2.2 Переделать выбор оффера в три компактных plan controls с явным
      selected state и ценами.
- [x] 2.3 Подключить общий `Segmented` для Platega и Telegram Stars и скрывать
      недоступный способ оплаты.
- [x] 2.4 Показать текущий срок подписки, подтверждение покупки, trial и историю
      оплат в едином контентном ритме.
- [x] 2.5 Не менять существующие invoice, webhook, polling и cancel flows.

## 3. Документация и проверка

- [x] 3.1 Добавить proposal, design, tasks и capability specs в OpenSpec.
- [x] 3.2 Прогнать `bun run typecheck`.
- [x] 3.3 Прогнать `bun run build:miniapp`.
- [ ] 3.4 Проверить вручную Mini App в Telegram WebView на 320/390px и обеих
      цветовых схемах.
- [x] 3.5 Выполнить `bun test` перед функциональным коммитом.
