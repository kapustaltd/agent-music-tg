## Why

На длинных экранах Mini App верхняя навигация должна оставаться доступной, а нижний tabbar не должен закрывать контент во время чтения списка. Сейчас header теряет sticky-поведение из-за поздних desktop/mobile overrides, а dock остаётся на экране при прокрутке.

## What Changes

- Закрепить app header у верхней границы viewport с безопасным отступом и читаемым фоном.
- Скрывать нижний tabbar после осмысленного scroll-down жеста с короткой анимацией.
- Возвращать tabbar, когда пользователь возвращается в самый верх страницы.
- Уважать `prefers-reduced-motion` и не менять layout reserve контента во время анимации.
- Добавить поведение в OpenSpec и покрыть его критериями для mobile и desktop.

## Capabilities

### New Capabilities
- `chrome-scroll-behavior`: sticky header и scroll-aware visibility нижнего tabbar.

### Modified Capabilities
- `glass-header`: header остаётся закреплённым при прокрутке.
- `persistent-bottom-nav`: dock скрывается вниз при scroll-down и появляется у верхней границы.

## Impact

- `miniapp/src/lib/useDockVisibility.ts` — новое клиентское состояние видимости dock.
- `miniapp/src/components/BottomNav.tsx` — подключение состояния к nav-классу.
- `miniapp/src/styles/anti-slop.css` — финальные правила sticky header, dock transition и reduced-motion.
- OpenSpec change-пакет — продуктовая спецификация, дизайн-решения и checklist реализации.

API, сервер, платежи, генерация плейлистов и визуальный язык приложения не меняются.
