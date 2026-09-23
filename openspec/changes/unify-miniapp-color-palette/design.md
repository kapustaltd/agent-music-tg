## Context

The Mini App already has a light/dark mode, a user-selectable accent, and semantic status tokens. However, `DESIGN.md` documents `#121212` / `#EEEEF3` as the canvases while the final palette block in `glass.css` overrides them with warm gray and olive-tinted values. The subscription flow also overrides the common accent with red and gives payment methods different selected colors.

## Goals and non-goals

**Goals**

- Keep the existing teal-led, content-first product identity.
- Give every screen the same neutral canvas, surface, text, muted-text, separator, and selection roles in light and dark schemes.
- Keep the user's accent choice consistent across creation, library, profile, playback, subscription, and admin screens.
- Keep status colors semantic and legible; they are separate from the brand accent.

**Non-goals**

- Do not redesign layout, typography, radii, imagery, or surface hierarchy.
- Do not recolor album art, payment-provider logos, or third-party media.
- Do not remove semantic success, warning, error, or information colors.
- Do not change the seven accent choices or the saved preference format.

## Decisions

### One palette definition, theme-aware aliases

Define the palette primitives once in `glass.css`, which is loaded before the Mini App completion rules:

| Role | Dark | Light |
| --- | --- | --- |
| Canvas | `#121212` | `#EEEEF3` |
| Surface | `#1C1C1F` | `#FFFFFF` |
| Raised surface | `#242428` | `#F7F7F8` |
| Main text | `#F2F3F5` | `#0D0D10` |
| Muted text | `rgba(242,243,245,.70)` | `rgba(13,13,16,.66)` |
| Separator | `rgba(255,255,255,.10)` | `rgba(13,13,16,.10)` |

Existing names such as `--canvas`, `--surface`, `--text-primary`, and `--content-hairline` remain aliases so component selectors do not need a broad migration. `anti-slop.css` must not introduce another set of base color values.

### One selection accent, separate status colors

`--accent` remains the default teal `#14B8A6` and continues to accept one of the existing profile presets. Active navigation, selected plans, selected payment methods, focus, and primary actions use this value and its tonal/foreground aliases. In the light scheme, `--accent-text` is darkened from the selected preset for readable text and icon contrast. Filled accent controls use the ink foreground token, whose contrast is above 4.5:1 for every existing preset.

Danger, success, warning, and information keep dedicated scheme-aware tokens because they communicate different outcomes. They must not be used to brand a screen or replace the user's selected accent.

### Bounded exceptions

Album artwork and provider marks retain their source colors. Scrims, masks, and glass highlights may use black or white with alpha because they are compositing effects. These exceptions do not set page canvases, text, or selected states.

## Risks and trade-offs

- Replacing the warm/olive neutrals changes the canvas across all screens. The change follows the palette already committed in `DESIGN.md` and preserves the existing light/dark structure.
- Darkening accent text in the light scheme changes its shade while preserving the selected hue family. Filled actions retain the chosen accent and use a stable foreground.
- Browser coverage may be incomplete for API-backed shop and playback states when no local Telegram backend is available; source review and build remain required, and the limitation must be recorded.

## Verification plan

1. Inspect the final CSS token definitions and ensure screen-level selected treatments use semantic aliases.
2. Build the Mini App and type-check the project.
3. Render and inspect at least home and profile screens in the available browser; inspect dark-theme aliases in source when Telegram theme simulation is unavailable.
4. Record API-dependent screens that cannot render in the local stand-in as unverified, not as passing.
