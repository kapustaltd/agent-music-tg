# Проверка change: remove-miniapp-ui-slop

Дата: 2026-09-23. Основа: `e467f9e1948582e636b429490beb0c7deb1f0245`. Проверенный diff: `miniapp/src/styles/{glass.css,anti-slop.css,clarify-flow.css}` и артефакты `openspec/changes/remove-miniapp-ui-slop/**`. Тип: самопроверка; независимое ревью не выполнялось.

## Соответствие требованиям

| Требование / сценарий | Реализация (файл:строка) | Проверка и результат | Статус |
|---|---|---|---|
| Поле главного сценария отделено от краёв на 320–390px | `miniapp/src/styles/anti-slop.css:817-844` | DevTools 320×780 и 390×844; gutter виден, `scrollWidth === viewport` | подтверждено |
| Подсказка поиска и действие заголовка не обрезаются на 320px | `miniapp/src/styles/anti-slop.css:184-190,840-844` | Визуально проверены поиск и плейлисты при 320px; подсказка занимает 72px, action переносится | подтверждено |
| Главные кнопки, swatches и повторные строки имеют удобную touch-цель | `miniapp/src/styles/anti-slop.css:140-144,1984-1998`; `miniapp/src/styles/glass.css:10829-10844,4929-4934` | При 320px ширины кнопок на home достаточно; profile swatches после переноса 45×44px | подтверждено |
| Поддержанные жесты не перехватывают соседнее действие или скролл | `miniapp/src/screens/PlayerScreen.tsx:181-245,265-272`; `miniapp/src/lib/swipeGesture.ts` | Исходники и существующие unit-тесты проверены; rails оставлены нативными; явный close у sheets сохранён | подтверждено |
| Нажатие и переходы дают короткую обратную связь, reduced motion сохраняется | `miniapp/src/styles/glass.css:3301-3309,9943-9959` | Browser-переходы и выбор примера доступны; `prefers-reduced-motion` ограничивает анимации | подтверждено |
| Тонкие повторные разделители заменены spacing и состояниями | `miniapp/src/styles/glass.css:10813-10844,11061-11070,11386-11394`; `miniapp/src/styles/clarify-flow.css:21-43,59-68` | Diff и браузерные экраны списка/профиля; progress, focus, selected-state и artwork не удалены | подтверждено |
| Keyboard inset и safe area остаются учтены | `miniapp/src/lib/keyboard.ts:49-85`; CSS использует `env(safe-area-inset-*)` | Код обнаружения keyboard и CSS просмотрены; физическую Telegram-клавиатуру в Chrome не эмулировал | подтверждено по коду; визуально не проверено |
| Полный anti-slop браузерный проход для всех success/loading/dialog экранов в light/dark | Все screen-файлы перечислены в `audit.md` | Vite запущен без backend; API-зависимые success-экраны и тёмная схема недоступны в этом стенде | не проверено |
| Impeccable catalog scan и triage | `openspec/changes/remove-miniapp-ui-slop/audit.md` | Bundled detector запущен один раз по `miniapp/src/`; вернул JSON с тремя `overused-font` предупреждениями, exit code 2 соответствует найденным warnings | подтверждено, finding вынесен в backlog |

## Находки

- **P2, unrequested:** desktop composer визуально уже переключателя режима (примерно 250px против 650px при 1280px). Зафиксировано в `audit.md`; влияния на мобильную компоновку нет. Рекомендация: `$impeccable layout`.
- **P3, unrequested:** detector считает Roboto распространённым шаблонным выбором. Не менял гарнитуру без отдельного типографического прохода; зафиксировано в `audit.md`. Рекомендация: `$impeccable typeset`.
- **P2, missing verification:** успешные ответы каталога/магазина, полноэкранный player, admin и тёмная тема не отрисовались полностью в локальном Vite без Telegram-сервера. Это ограничение browser pass, а не утверждение об отсутствии дефекта.
- Более широкий anti-slop backlog в разделах 2–4 исходного `tasks.md` (`unrequested` для этого mobile-pass: surface hierarchy, copy, декоративные эффекты) не исправлялся; выводы для дальнейшего выбора пользователя записаны в `audit.md`.

## Проверки

| Команда или ручной сценарий | Результат | Ограничение |
|---|---|---|
| `bun run typecheck` | успех | — |
| `bun run test` | успех: 608 pass, 0 fail | — |
| `bun run build:miniapp` | успех: Vite собрал 399 modules | — |
| `git diff --check` | успех | — |
| Bundled Impeccable detector по `miniapp/src/` | JSON получен; 3 font warnings; exit 2 | baseline до реализации не был снят |
| Chrome mobile 320×780: главная, поиск, выбор примера, профиль, плейлисты error-state | успех для видимых состояний; ширина документа совпала с viewport | API-зависимые success-состояния отсутствуют без сервера |
| Chrome mobile 390×844 и desktop 1280×900 | нет горизонтального overflow; desktop-компоновка записана как follow-up | локальная тема осталась light |

## Итог

**Готово по явному объёму mobile-pass:** touch-поправки, отступы/клиппинг, короткая motion-обратная связь и удаление повторных полосок реализованы, обязательные typecheck/tests/build прошли. Полный визуальный прогон всех screen states остаётся открытым из-за отсутствия Telegram backend и тёмной темы в локальном стенде. Пункты broader visual cleanup и оба зафиксированных дизайн-рекомендации остаются в OpenSpec/audit backlog.

## Дополнение: линии статуса подписки

Дата: 2026-09-23. После повторной проверки CSS-каскада обнаружена единственная активная декоративная пара линий вокруг `.subscription-status` (`styles/anti-slop.css`). Линии заменены на `border-block: 0`; вертикальные отступы и содержимое статуса сохранены. Аналогичные color overrides у истории покупок и секций артиста не создают видимых границ из-за более поздних правил `border: 0`.

| Проверка | Результат |
|---|---|
| `bun run build:miniapp` | успешно; TypeScript compile и Vite build проходят |
| `git diff --check` | успешно |
| Проверка итогового CSS-правила `.subscription-status` | разделительные границы отключены, spacing сохранён |

Полный browser pass остаётся ограничен описанным выше отсутствием Telegram backend и эмуляцией тёмной темы.
