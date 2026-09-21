# Tasks: simplify-generated-playlist-card

## 1. Baseline and audit

- [ ] 1.1 Capture the current ResultsScreen and GenerationStatus at 320px,
      480px, and a wide viewport in light/dark themes; record every visible
      stripe, separator, halo, and surface treatment with its purpose.
- [ ] 1.2 Inventory the effective selectors for `results-panel`,
      `results-playlist-header`, `prompt-request-summary`, action bar, and
      `generation-status` across `glass.css` and `anti-slop.css`.
- [ ] 1.3 Mark each remaining gradient, border, shadow, and animation as
      `remove`, `simplify`, `replace`, or `intentional exception`.

## 2. Remove the ungrounded request action

- [ ] 2.1 Remove the request-summary row and request-level «Изменить» button
      from `miniapp/src/screens/ResultsScreen.tsx`.
- [ ] 2.2 Remove `onEditRequest` from `ResultsScreen` props and its `App.tsx`
      call site when no other consumer remains; keep the original request in
      navigation/state only where it is needed by existing flows.
- [ ] 2.3 Keep `playlist-name-edit-btn` and verify it still edits only the
      generated playlist name.

## 3. Simplify the generated card hierarchy

- [ ] 3.1 Consolidate the final result-screen rules into one predictable layer;
      remove stale/conflicting request-summary and result-card declarations.
- [ ] 3.2 Remove decorative side bars, pseudo-element accents, repeating
      gradients, and the request-summary separator; use spacing and typography
      for grouping.
- [ ] 3.3 Align the artwork and identity copy as one group on wide screens and
      stack them without clipping on narrow screens.
- [ ] 3.4 Keep «Скачать» as the only primary action and make save/share
      secondary without changing their handlers or labels.
- [ ] 3.5 Verify that the result-screen cleanup does not regress the separate
      loading change `improve-generation-loading-ui`.

## 4. Verification

- [ ] 4.1 Run `npx impeccable detect miniapp/src/` if the detector is available;
      resolve relevant findings or record intentional exceptions in the audit.
- [ ] 4.2 Manually check prompt → generation → result, download idle/sending/
      sent/error, save, share, track playback, and playlist rename flows.
- [ ] 4.3 Verify 320px, 480px, and wide viewports in light/dark themes; confirm
      no horizontal overflow, clipped text, layout shift, or unexplained stripe.
- [ ] 4.4 Run `bun run typecheck` and `bun run build:miniapp`.
- [ ] 4.5 Review focus-visible states, touch targets, ARIA labels, and
      `prefers-reduced-motion` before closing the change.
