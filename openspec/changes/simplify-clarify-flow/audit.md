# simplify-clarify-flow — Audit

Проверка выполнена 2026-09-21. Источник визуальных критериев — каталог
[Impeccable Slop](https://impeccable.style/slop/).

| Finding / состояние | Решение | Обоснование |
| --- | --- | --- |
| Повтор заголовка и model-generated question на Clarify | remove | Экран теперь содержит одну продуктовую рамку и короткое действие; backend question остаётся доступным боту/API. |
| Опции выбора и прогресс одновременно раскрыты | simplify | После отправки остаётся выбранный ответ, остальные варианты и поле скрываются. |
| «Напишите» рядом с «ты» | replace | Поле использует «Или опиши свой вариант…», единообразно с helper-текстом. |
| Статус генерации конкурирует с заголовком | simplify | Статус и найденные треки остаются функциональным preview, но используют вторичный размер и плоские строки. |
| Roboto отмечен detector как overused-font | intentional exception | В проекте Roboto Variable уже поставляется локально с кириллическими и латинскими subset’ами; смена шрифта не нужна для этого сценария и затрагивала бы весь Mini App. |

## Проверенные состояния

- idle: заголовок, helper, три опции и custom input;
- busy после опции и после custom answer: выбранный ответ, disabled «· Изменить»,
  текущая фаза и найденные треки;
- сохранены Enter/send для custom answer, playback строк preview, focus-visible и
  отключение spinner при `prefers-reduced-motion`.

## Detector

`npx impeccable detect miniapp/src/` завершает работу с тремя одинаковыми
finding’ами `overused-font` в `miniapp/src/styles/fonts.css`, потому что один
шрифт объявлен для трёх локальных subset’ов. Новых finding’ов от этого change
не появилось; finding записан выше как intentional exception.
