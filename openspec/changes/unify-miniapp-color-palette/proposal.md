## Why

The Mini App defines a calm teal and neutral visual system in `DESIGN.md`, but its active styles also define a second warm/olive canvas, a separate red subscription accent, and payment-selection colors. Screens can therefore look like they use different products even though theme and accent preferences are shared.

## What Changes

- Make the documented light/dark neutral colors the sole source for Mini App canvas, surfaces, text, muted text, and separators.
- Route selected plans, payment methods, and primary actions through the profile-selected accent; retain separate semantic colors for success, warning, error, and information.
- Document deliberate exceptions such as album artwork, payment-provider marks, and translucent overlays in the palette spec.
- Audit the rendered Mini App against the existing product-specific design language using the `anti-ui-slop` audit guidance.

## Capabilities

### Modified Capabilities

- `visual-foundation`: define one shared palette across Mini App screens and supported color schemes.

## Impact

- Mini App color tokens and screen styles in `miniapp/src/styles/glass.css` and `miniapp/src/styles/anti-slop.css`.
- The palette contract in this OpenSpec change.
- No API, persisted data, or screen behavior changes. The profile accent choices remain available.
