## Why

В Mini App накопились визуальные приёмы из liquid-glass слоя, которые местами работают как декорация вместо помощи пользователю: стекло поверх стекла, glow/градиенты, одинаковые карточки, чрезмерные pill-формы и второстепенная анимация. Нужен отдельный проход по интерфейсу, чтобы убрать эти признаки AI slop и оставить только визуальные решения, связанные с музыкальным сценарием, состоянием или брендом.

Аудит опирается на каталог [Impeccable Slop](https://impeccable.style/slop/): glassmorphism everywhere, radial glow, gradient text, side-tab accents, nested/identical cards, flat hierarchy, decorative motion, generic copy и связанные quality-проверки.

## What Changes

- Провести инвентаризацию всех экранов, общих компонентов и `miniapp/src/styles/glass.css` с фиксацией найденных slop-паттернов и намеренных исключений.
- Упростить иерархию поверхностей: убрать декоративное стекло на обычных панелях, вложенные контейнеры без отдельной задачи, дублирующие border + shadow и декоративные боковые полосы.
- Убрать неинформативные glow, фоновые halo, gradient text, повторяющиеся акцентные заливки и чрезмерные радиусы; сохранить градиенты и blur только там, где они передают состояние, слой, медиа или системную affordance.
- Привести типографику, spacing, карточки и короткие русские тексты к содержательной иерархии без повторяющихся labels, шаблонных marketing claims и декоративной пунктуации.
- Убрать декоративную motion: пульсацию статусов, blinking cursor, marquee и bounce/elastic easing; сохранить анимации реального проигрывания, генерации, прогресса и переходов, не нарушающие `prefers-reduced-motion`.
- Проверить light/dark темы, narrow viewport, empty/loading/error/admin/player/dialog состояния и доступность после изменений.

## Capabilities

### New Capabilities

- `anti-slop-ui`: правила и проверяемые сценарии для очистки Mini App от неосмысленных AI-дизайн паттернов.

### Modified Capabilities

- `visual-foundation`: уточнить допустимые поверхности, акценты, радиусы, shadows и decorative effects.
- `component-system`: упростить общие панели, кнопки, поля, dock и карточки без потери поведенческих hooks.
- `shared-ui-components`: применить единые правила к `GlassPanel`, `PlayerBar`, `BottomNav`, `TrackRow`, notices и sheets.

## Impact

- **Mini App:** `miniapp/src/styles/glass.css`, `miniapp/src/components/**`, `miniapp/src/screens/**` и при необходимости `miniapp/src/App.tsx`.
- **Проверки:** добавится источник правды для ручного аудита и запуска `npx impeccable detect miniapp/src/` без добавления runtime-зависимости.
- **Поведение:** API, сервер, платёжный поток, аудио и навигационные сценарии не меняются; существующие классы и DOM hooks сохраняются, если они нужны логике.
- **Документация:** в итоговом изменении фиксируются намеренные визуальные исключения, чтобы следующий UI-проход не вернул удалённые паттерны.
