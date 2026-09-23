# generation-loading

## Requirement: Blocks loading indicator

While generation or clarification is busy, the Mini App MUST display `Blocks` from `loading-dev` at 24 px next to the existing timer and public phase trace. It MUST keep the found-track preview and MUST NOT display Swirl in that status.

### Scenario: Loading before tracks arrive

- **WHEN** generation starts with no track previews
- **THEN** Blocks, the timer and the initial phase are visible

### Scenario: Tracks arrive

- **WHEN** progress includes tracks
- **THEN** Blocks remains visible and the existing preview rows remain usable

### Scenario: Narrow viewport

- **WHEN** the viewport is 390 CSS pixels wide
- **THEN** the status fits without horizontal scrolling
