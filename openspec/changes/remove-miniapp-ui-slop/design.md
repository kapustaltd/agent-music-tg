## Context

Mini App построен вокруг большого `miniapp/src/styles/glass.css` и компонентов с историческими именами `GlassPanel`/`glass-*`. В стилях одновременно живут обычные панели, liquid-glass v2, blur/saturate, несколько shadow-слоёв, pill-радиусы, градиенты, skeleton/reveal-анимации и stateful motion для reasoning/player. Поэтому задача не должна механически удалить каждое совпадение слова `glass`, `gradient` или `animation`: часть эффектов объясняет слой, загрузку, прогресс или активное проигрывание.

Каталог Impeccable рассматривает finding как повод проверить контекст, а не как автоматический запрет. Для этого change вводит сначала evidence-based inventory, затем точечные упрощения с явной фиксацией исключений.

## Goals / Non-Goals

**Goals:**

- Сделать визуальную иерархию Mini App более продуктовой: сначала prompt, playlist, track и действие, затем вторичная метаинформация.
- Свести каждую поверхность к понятной роли и убрать слои, которые повторяют друг друга.
- Сохранить узнаваемую музыкальную идентичность, light/dark тему, состояния player/generation и доступные интеракции.
- Оставить после прохода проверяемый список «удалено / заменено / оставлено намеренно».

**Non-Goals:**

- Не менять API, базу, авторизацию, платежи, аудио или бизнес-правила.
- Не заменять весь визуальный язык новым дизайн-системным пакетом и не делать полный rebrand.
- Не запрещать все градиенты, blur, rounded shapes или animation без проверки их роли.
- Не удалять `GlassPanel` и другие JS/DOM hooks только из-за названия; их presentation можно упростить без breaking API.

## Decisions

### Решение: сначала каталог findings, затем правки

Перед изменениями нужно перечислить экраны, общие компоненты и CSS selectors, прогнать `npx impeccable detect miniapp/src/` и дополнить результат ручной проверкой. Для каждого finding указывается действие: remove, simplify, replace или intentional exception.

Это предотвращает blanket-правила вроде «убрать любой gradient», которые сломали бы artwork, skeleton или progress affordance.

### Решение: одна понятная поверхность на одну задачу

Для обычного контента применяется иерархия `canvas → optional panel → content/control`. Card внутри card допустима только при независимой интеракции или отдельном статусе. Border и shadow не должны одновременно описывать одну и ту же границу; alert/status stripe сохраняется только если цвет и положение действительно сообщают статус.

### Решение: функциональные эффекты — через семантические исключения

Сохраняются только эффекты, которые объясняют происходящее: overlay/dialog layer, focus ring, skeleton loading, progress/seek, active generation/reasoning и active playback. Декоративные halo, neon glow, gradient text, случайные stripes и одинаковые accent-эффекты удаляются или заменяются на spacing, contrast и typography.

### Решение: не ломать behavioral hooks при упрощении CSS

Компоненты и обработчики могут продолжить использовать старые классы, если они нужны тестам или event delegation. Визуальные изменения делаются через существующие selectors или совместимые CSS classes; изменение разметки допускается только когда оно убирает реальную вложенность/дублирование и сохраняет семантику.

### Решение: motion должна объяснять изменение состояния

Статичный status dot не пульсирует, обычный текст не получает blinking cursor, контент не прокручивается сам и routine dialog не bounce-ится. Анимация playback/generation и переходы остаются, но проходят проверку на layout shift и `prefers-reduced-motion`.

## Risks / Trade-offs

- [Risk] Удаление стекла или радиусов может затронуть несколько экранов через общий CSS. → Mitigation: менять токены и компоненты группами, проверять light/dark и ключевые states после каждой группы.
- [Risk] Снижение декоративности может сделать пустые состояния слишком плоскими. → Mitigation: усиливать hierarchy, copy и actionable empty state, а не возвращать декоративные слои.
- [Risk] Существующие OpenSpec changes содержат liquid-glass требования. → Mitigation: в audit matrix явно отметить конфликтующие требования; этот change касается только итогового Mini App и не переписывает историю завершённых changes.
- [Risk] Detector найдёт допустимый эффект как потенциальный finding. → Mitigation: хранить rationale для intentional exceptions и проверять их по задаче пользователя.

## Verification Plan

1. Выполнить source scan `npx impeccable detect miniapp/src/` и, если доступен running Mini App, browser scan локального URL.
2. Повторить detector после правок; каждый оставшийся AI-slop finding должен быть устранён либо обоснован в audit matrix.
3. Прогнать `bun run typecheck`, `bun test` и `bun run build:miniapp` по правилам репозитория.
4. Просмотреть состояния prompt, clarify, results, profile, shop, playlists, admin, player, empty/loading/error/dialog в light/dark темах и ширине 320px.
5. Проверить keyboard focus, contrast, touch targets, отсутствие horizontal overflow и поведение `prefers-reduced-motion`.
