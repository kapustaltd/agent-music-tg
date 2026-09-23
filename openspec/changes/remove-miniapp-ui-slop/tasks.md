# Tasks: remove-miniapp-ui-slop-and-mobile-refinement

## 1. Audit and baseline

- [x] 1.1 Inventory all Mini App screens, shared components, `glass.css` sections, and rendered states; map each candidate to an Impeccable catalog category. Evidence: `audit.md`.
- [ ] 1.2 Run `npx impeccable detect miniapp/src/` and, when a local server is available, scan the rendered Mini App; record the baseline findings without adding the detector as a runtime dependency.
- Baseline detector findings were not captured before implementation; the post-change bundled detector result is recorded in `audit.md`.
- [x] 1.3 Create an audit matrix with `remove`, `simplify`, `replace`, or `intentional exception`, including rationale for artwork, skeletons, progress, overlays, focus, playback, and generation motion. Evidence: `audit.md`.

## 2. Surface and decoration cleanup

- [ ] 2.1 Simplify ordinary `GlassPanel`/card/row surfaces so a single content group has one clear container treatment; flatten nested decorative cards while preserving independent dialogs, sheets, and interactive groups.
- [ ] 2.2 Remove ordinary-surface backdrop blur/saturation, highlight overlays, ambient halo, neon glow, and decorative accent stripes; retain only documented layering, status, media, loading, or focus exceptions.
- [ ] 2.3 Remove cases where a hairline border and a broad shadow redundantly define the same surface; consolidate radii and shadows through existing tokens rather than adding one-off values.
- [ ] 2.4 Replace extreme pill-shaped containers and oversized icon tiles where they compete with the content; keep compact chips and controls pill-shaped only when their affordance benefits from it.

## 3. Hierarchy, layout, and copy

- [ ] 3.1 Remove or reposition redundant eyebrow labels, badges, and icon tiles above headings; keep them only when they add information not present in the heading.
- [ ] 3.2 Refactor identical card grids and monotonous spacing so related content groups read together and important actions/results receive the strongest hierarchy.
- [ ] 3.3 Correct flat type hierarchy, essential text that is too small/low-contrast, long text measures, edge-touching content, and narrow-viewport clipping without changing the Russian product voice.
- [ ] 3.4 Review user-facing Mini App copy for repeated labels, generic marketing claims, forced contrast, and decorative em-dash-heavy phrasing; rewrite only where it improves clarity or actionability.
- [ ] 3.5 Remove placeholder-like decorative illustrations or replace them with imagery specific to the music workflow; do not replace useful artwork with generic shapes.

## 4. Motion and state safety

- [ ] 4.1 Remove decorative pulsing/blinking/marquee/bounce effects from static UI; preserve motion that communicates active generation, playback, progress, or navigation.
- [x] 4.2 Ensure retained motion uses transforms where possible, does not shift surrounding layout, and has a `prefers-reduced-motion` fallback.
- [ ] 4.3 Verify loading, empty, error, dialog, focus, and disabled states remain visible and actionable after removing visual effects.

## 5. Verification and handoff

- [x] 5.1 Run the bundled Impeccable detector against `miniapp/src/`; record and triage its findings in the audit matrix.
- [ ] 5.2 Review prompt, clarify, results, profile, shop, playlists, admin, player, and shared screens in light/dark themes at a 320px viewport and a desktop viewport.
- [x] 5.3 Run `bun run typecheck`, `bun run test`, and `bun run build:miniapp`; fix only regressions introduced by this change.
- [x] 5.4 Review the final diff for preserved behavior hooks, keyboard focus, contrast, touch targets, no horizontal overflow, and no new generic visual pattern.

## 6. Mobile interaction and motion pass

- [x] 6.1 Map actionable controls in every Mini App screen and shared component; bring phone hit areas to the existing 44px product target and remove hover-only access paths. (`App.tsx`, `screens/**`, `components/**`, `styles/anti-slop.css`)
- [x] 6.2 Tune the shared mobile content gutter, prompt composer and fixed chrome for safe areas and keyboard, with the smallest supported width as the constraint. (`styles/glass.css`, `styles/anti-slop.css`)
- [x] 6.3 Add or correct purposeful, interruptible state and navigation feedback; preserve/reuse horizontal rail scrolling and player swipe-dismiss while preventing gesture conflicts. (`components/ScreenTransition.tsx`, `screens/PlayerScreen.tsx`, relevant screen/components and CSS)
- [x] 6.4 Replace decorative repeated row/section separators with spacing and grouping; retain only structural or functional indicators and record justified exceptions in `audit.md`. (`styles/glass.css`, `styles/anti-slop.css`, audit.md)
- [ ] 6.5 Confirm Impeccable detector findings in context and complete the browser pass at 320px, phone width and desktop; update `review.md` with implemented requirements and remaining backlog.

## Audit backlog

The wider surface/decoration, copy and typography cleanup in tasks 2.x–4.x remains a separate follow-up beyond this mobile interaction and divider-removal pass. The Impeccable recommendations are listed in `audit.md`; do not treat an audit suggestion as an implemented change.
