## 1. Specification

- [x] 1.1 Define the two-command Telegram surface and non-goals.
- [x] 1.2 Define `/start` deep-link compatibility and payment exception.

## 2. Bot implementation

- [x] 2.1 Reduce `createBot` registration to `/start`, `/stats` and payment updates.
- [x] 2.2 Make `/start` send exactly one Mini App button and remove persistent menu.
- [x] 2.3 Reduce admin panel to admin-only `/stats` text output.

## 3. Verification and release

- [x] 3.1 Replace obsolete routing expectations with regression tests for `/start`,
  `/stats`, and ignored commands/callbacks/text/inline updates.
- [x] 3.2 Update README and review evidence.
- [x] 3.3 Run typecheck, isolated tests, Mini App build and dashboard build.
- [ ] 3.4 Create functional and release-notes commits, then push; do not deploy.
