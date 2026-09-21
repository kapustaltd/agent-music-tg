## 1. Scroll-aware chrome

- [x] 1.1 Add `useDockVisibility` with passive scroll listener, rAF batching, 16px hide slop and 24px top reveal threshold.
- [x] 1.2 Apply `.dock--hidden` from `BottomNav` without changing tab ordering or navigation callbacks.
- [x] 1.3 Keep mobile layout reserve and keyboard-inset behavior unchanged.

## 2. Sticky header and anti-slop finish

- [x] 2.1 Restore sticky positioning and safe-area top offset for `.app-top-bar` after legacy overrides.
- [x] 2.2 Add a quiet translucent backdrop so sticky header remains legible over scrolling content.
- [x] 2.3 Animate mobile dock with transform/opacity; keep desktop rail visible and add reduced-motion fallback.

## 3. Verification

- [x] 3.1 Run `bun run typecheck`.
- [x] 3.2 Run `bun test`.
- [x] 3.3 Run `bun run build:miniapp`.
- [x] 3.4 Render and inspect mobile scroll, top reveal, desktop rail and reduced-motion CSS fallback.
