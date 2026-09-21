## Context

Mini App прокручивается корневым viewport: `app-shell` не должен быть вертикальным scroll-контейнером. `overflow-x: hidden` вычисляет `overflow-y: auto` и незаметно создаёт nested scrollport, поэтому для горизонтального guard используется `overflow-x: clip`. Header живёт внутри `app-sidebar`, который на узких экранах использует `display: contents`, поэтому sticky-позиционирование должно задаваться самому `.app-top-bar`. На desktop sidebar остаётся вертикальным rail и должен оставаться на месте.

Нижний dock — fixed mobile chrome с зарезервированным пространством в `.app-shell`. Пространство нельзя удалять при скрытии: иначе список будет скакать, а последний элемент окажется под dock после его возврата.

## Goals / Non-Goals

**Goals:**

- Header приклеен к верхней части viewport при прокрутке.
- Dock скрывается только после уверенного движения вниз, чтобы микроскопический touch jitter не дёргал интерфейс.
- Dock появляется при `scrollY <= 24px`, то есть когда пользователь реально вернулся к началу.
- Анимация использует transform/opacity, не влияет на layout и не блокирует контент.
- На desktop rail остаётся постоянно доступным; scroll-aware hide ограничен mobile dock.
- При `prefers-reduced-motion: reduce` переход отключается.

**Non-Goals:**

- Не менять порядок табов, active-state, высоту dock или навигационную логику.
- Не показывать dock на каждом scroll-up: явная точка возврата — верх страницы.
- Не добавлять библиотеку для scroll-анимаций.
- Не менять full-screen player, WebNowPlaying или keyboard inset behavior.

## Decisions

### 1. Sticky вместо fixed для header

Используем `position: sticky` с `top: max(8px, env(safe-area-inset-top, 0px))`. Header остаётся в нормальном потоке, поэтому не перекрывает первый экран, но продолжает быть доступным при прокрутке. На desktop для header сохраняется sticky-роль внутри rail с `var(--desktop-sticky-top)`.

Чтобы текст под header не просвечивал сквозь него, добавляем полупрозрачный фон на базе существующего `--lg-v2-bg`, тонкую hairline-границу и умеренный blur. Новых цветов и декоративных слоёв не вводим.

### 2. Состояние dock вычисляется по намерению прокрутки

`useDockVisibility` слушает root `window` scroll passive-обработчиком и батчит обновление через `requestAnimationFrame`. Состояние меняется так:

- в начале dock видим;
- накопленное движение вниз `16px` после `scrollY > 24px` скрывает dock;
- движение вверх само по себе dock не показывает;
- `scrollY <= 24px` всегда показывает dock и сбрасывает накопление.

Так tabbar не мигает от jitter и не возвращается раньше времени во время чтения. Cleanup снимает listener и отменяет pending animation frame.

### 3. Скрытие — только визуальное и только на mobile

Класс `.dock--hidden` переводит dock вниз через `translateY(calc(100% + 24px))`, меняет opacity и выключает pointer events. Bottom reserve остаётся прежним. CSS-правило находится в `anti-slop.css`, который импортируется после legacy `glass.css`, поэтому поведение не зависит от порядка старых экспериментов. На desktop класс бездействует, чтобы постоянная rail-навигация не исчезала.

### 4. Reduced motion

При `prefers-reduced-motion: reduce` переход dock отключается. Само состояние видимости продолжает следовать навигационной логике: пользователь не теряет управление, просто переключение происходит без анимации.

## Risks / Trade-offs

- Пользователь, находящийся в середине длинного списка, не видит tabbar до возврата наверх. Это соответствует запросу и сохраняет контент чистым; header и системная навигация остаются доступны.
- При resize между mobile и desktop hook может сохранить скрытое состояние, но CSS не применяет его к desktop rail; при следующем возврате к top состояние синхронизируется.
- `requestAnimationFrame` зависит от доступности browser API; hook вызывается только после mount в Mini App, а cleanup защищает от позднего обновления после unmount.

## Verification

- Проверить `bun run typecheck`.
- Проверить `bun test`.
- Проверить `bun run build:miniapp`.
- В браузере проверить mobile: header остаётся сверху, dock скрывается после scroll-down, появляется при возврате в top; проверить desktop rail и reduced-motion CSS.
