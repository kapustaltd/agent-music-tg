## Why

В Mini App накопились визуальные приёмы из liquid-glass слоя, которые местами работают как декорация вместо помощи пользователю: стекло поверх стекла, glow/градиенты, одинаковые карточки, чрезмерные pill-формы и второстепенная анимация. Нужен отдельный проход по интерфейсу, чтобы убрать эти признаки AI slop и оставить только визуальные решения, связанные с музыкальным сценарием, состоянием или брендом.

Аудит опирается на каталог [Impeccable Slop](https://impeccable.style/slop/): glassmorphism everywhere, radial glow, gradient text, side-tab accents, nested/identical cards, flat hierarchy, decorative motion, generic copy и связанные quality-проверки.

## What Changes

- Провести Impeccable-инвентаризацию экранов, общих компонентов, `glass.css` и ключевых состояний; сохранить выводы, оценки и намеренные исключения в `audit.md`.
- Сделать touch-сценарии предсказуемыми: доступные зоны нажатия, отсутствие hover-only действий, keyboard/safe-area awareness и естественные жесты без перехвата прокрутки, полей и системной навигации.
- Исправить выявленные мобильные отступы и обрезание текста/действий на узкой ширине.
- Дать короткую обратную связь на нажатие и смену экрана с `prefers-reduced-motion` fallback.
- Удалить повторяющиеся разделители строк и секций там, где группировку яснее передают интервалы и состояния; сохранить seek/progress, focus, selected-state и другие функциональные индикаторы.
- Рекомендации шире этих пунктов (surface hierarchy, декоративные эффекты, copy, брендовая типографика) оставить в audit backlog до отдельного выбора, а не автоматически превращать в rebrand.

## Scope for this implementation

Этот проход закрывает mobile-interactions, короткую motion-обратную связь, мобильный gutter/clipping и повторяющиеся разделители. Impeccable-аудит смотрит шире, но его остальные замечания являются рекомендациями для следующего прохода и перечислены в `audit.md`.

## Capabilities

### New Capabilities

- `anti-slop-ui`: правила и проверяемые сценарии для очистки Mini App от неосмысленных AI-дизайн паттернов.

### Modified Capabilities

- `visual-foundation`: уточнить допустимые поверхности, акценты, радиусы, shadows и decorative effects.
- `component-system`: упростить общие панели, кнопки, поля, dock и карточки без потери поведенческих hooks.
- `shared-ui-components`: применить единые правила к `GlassPanel`, `PlayerBar`, `BottomNav`, `TrackRow`, notices и sheets.

## Impact

- **Mini App:** `miniapp/src/styles/glass.css`, `miniapp/src/components/**`, `miniapp/src/screens/**` и при необходимости `miniapp/src/App.tsx`.
- **Проверки:** `audit.md` фиксирует ручные browser checks и результат bundled Impeccable detector без runtime-зависимости.
- **Поведение:** API, сервер, платёжный поток и аудио не меняются; жесты уточняют только существующие Mini App UI-сценарии. Существующие классы и DOM hooks сохраняются, если они нужны логике.
- **Документация:** в итоговом изменении фиксируются намеренные визуальные исключения, чтобы следующий UI-проход не вернул удалённые паттерны.
