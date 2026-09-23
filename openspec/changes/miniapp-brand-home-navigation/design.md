# Mini App brand home navigation — Design

## Context

`App.tsx` owns the Mini App's screen history. Its root screen is `prompt`; the
header currently renders the brand as a non-interactive span. The create screen
can retain local composer state while it stays mounted, so returning home from
another prompt mode must reset that screen instance as well as the history.

## Decisions

1. Render the full header brand as a native button with the accessible name
   «На главную». Keep its existing visual placement and reset browser button
   chrome in the existing header style.
2. The action resets history to the default AI prompt, clears the visible error,
   and uses the existing navigation helper to close the player and artist
   overlays. A key change remounts `PromptScreen`, clearing its query and local
   mode state, including when it was already the current screen.
3. No URL or browser-history routing is introduced; this action uses the
   existing in-memory screen model.

## Risks

- A visually styled button must retain keyboard focus indication and the
  existing header layout. Verify the button remains centered at a narrow
  viewport.
