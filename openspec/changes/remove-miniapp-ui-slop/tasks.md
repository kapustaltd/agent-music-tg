# Tasks: remove-miniapp-ui-slop

## 1. Audit and baseline

- [ ] 1.1 Inventory all Mini App screens, shared components, `glass.css` sections, and rendered states; map each candidate to an Impeccable catalog category.
- [ ] 1.2 Run `npx impeccable detect miniapp/src/` and, when a local server is available, scan the rendered Mini App; record the baseline findings without adding the detector as a runtime dependency.
- [ ] 1.3 Create an audit matrix with `remove`, `simplify`, `replace`, or `intentional exception`, including rationale for artwork, skeletons, progress, overlays, focus, playback, and generation motion.

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
- [ ] 4.2 Ensure retained motion uses transforms where possible, does not shift surrounding layout, and has a `prefers-reduced-motion` fallback.
- [ ] 4.3 Verify loading, empty, error, dialog, focus, and disabled states remain visible and actionable after removing visual effects.

## 5. Verification and handoff

- [ ] 5.1 Re-run `npx impeccable detect miniapp/src/`; resolve every relevant AI-slop finding or add its documented intentional exception to the audit matrix.
- [ ] 5.2 Review prompt, clarify, results, profile, shop, playlists, admin, player, and shared screens in light/dark themes at a 320px viewport and a desktop viewport.
- [ ] 5.3 Run `bun run typecheck`, `bun test`, and `bun run build:miniapp`; fix only regressions introduced by this change.
- [ ] 5.4 Review the final diff for preserved behavior hooks, keyboard focus, contrast, touch targets, no horizontal overflow, and no new generic visual pattern.
