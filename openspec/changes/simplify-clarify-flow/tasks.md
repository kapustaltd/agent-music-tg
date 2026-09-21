# simplify-clarify-flow — Tasks

## Specification

- [x] 1.1 Зафиксировать проблему повторяющегося вопроса, смешения этапов и
  неестественной формулировки вариантов.
- [x] 1.2 Описать состояния idle/busy, поведение выбранного ответа и границу
  между Mini App copy и model copy.

## Implementation

- [x] 2.1 Обновить ClarifyScreen: фиксированные заголовок и helper, единый
  регистр «ты», компактный список и свернутый выбранный ответ.
- [x] 2.2 Уменьшить визуальный вес прогресса и сохранить доступные строки
  найденных треков.
- [x] 2.3 Добавить guardrails для естественных `clarify`-опций в agent prompt и
  tool schema.

## Verification

- [x] 3.1 Выполнить `bun run typecheck`, `bun test` и `bun run build:miniapp`.
- [x] 3.2 Повторно прогнать `npx impeccable detect miniapp/src/` и зафиксировать
  оставшееся finding шрифта как intentional exception.
- [ ] 3.3 После выкладки проверить Telegram WebView на 320–390px и светлой теме.
