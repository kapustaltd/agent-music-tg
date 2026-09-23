# Mini App brand button returns home

## Why

The Agent Music brand in the Mini App header is static. Users who open another
screen or tab cannot use the brand to return to the app's starting screen.

## What Changes

- Make the header brand a keyboard-accessible button that returns to the default
  prompt screen.
- Reset the prompt screen to its initial mode and empty composer when returning
  home, and clear transient overlays and errors.

## Capabilities

### New Capabilities

- `brand-home-navigation`: header brand returns the user to the Mini App start
  screen.

### Modified Capabilities

None.

## Impact

- `miniapp/src/App.tsx` — home navigation behavior and semantic button.
- `miniapp/src/styles/glass.css` — reset native button chrome for the brand.
- Frontend only; no API, server, data, or dependency changes.
