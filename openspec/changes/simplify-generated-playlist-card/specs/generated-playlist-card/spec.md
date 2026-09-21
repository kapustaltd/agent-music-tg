# generated-playlist-card Specification

## ADDED Requirements

### Requirement: Result screen starts with the generated playlist

The results screen SHALL start with the generated playlist identity block:
artwork, playlist name, and track count. It SHALL NOT render a separate
`prompt-request-summary` block or a request-level «Изменить» action above it.

#### Scenario: Result with an original request

- **WHEN** a generated result has an original request available
- **THEN** the playlist header is the first result content and no «Запрос» /
  «Изменить» request-summary row is rendered

#### Scenario: Playlist-name editing remains contextual

- **WHEN** the user wants to rename the generated playlist
- **THEN** the existing title-level rename control remains available next to the
  playlist name, independently of request editing

### Requirement: Generated result has no decorative stripes

The generated result area SHALL NOT use decorative side stripes, pseudo-element
accent bars, repeating-gradient textures, or redundant section lines to fill
space or create importance. The artwork, typography, spacing, and semantic state
styles SHALL carry the hierarchy.

#### Scenario: Ordinary result state is visually quiet

- **WHEN** the result screen is rendered with a valid playlist and no transient
  error
- **THEN** the result area has no decorative colored strip or texture around the
  card/header, and one border/shadow treatment does not redundantly describe the
  same surface

#### Scenario: Functional visual treatment is preserved

- **WHEN** artwork, loading, progress, focus, status, or scroll affordance needs
  a visual treatment
- **THEN** that treatment may remain only when its state/interaction purpose is
  apparent and it does not become a generic decoration for the whole result

### Requirement: Playlist identity has a stable responsive hierarchy

The result header SHALL keep artwork, name, and track count in one intentional
reading group. On wide layouts the text SHALL align with the artwork instead of
floating in unused space; on narrow layouts the group SHALL stack or shrink
without clipping or horizontal overflow.

#### Scenario: Narrow result viewport

- **WHEN** the result screen is rendered at 320–480px wide
- **THEN** artwork, playlist name, track count, and the first action remain
  visible with consistent spacing and no horizontal scrolling caused by the
  header

#### Scenario: Long playlist name

- **WHEN** the playlist name is long or contains mixed scripts
- **THEN** it wraps or ellipsizes within the content column without pushing the
  artwork or action bar outside the viewport

### Requirement: Result actions communicate priority

The action bar SHALL keep «Скачать» as the only primary action. «Сохранить» and
«Поделиться» SHALL remain secondary controls, and the removal of request editing
SHALL NOT introduce another CTA or change their handlers/API behavior.

#### Scenario: Stable action hierarchy

- **WHEN** the result screen is idle, sending, sent, or displaying a recoverable
  download error
- **THEN** the action bar keeps one primary download treatment, secondary actions
  remain visually subordinate, and state changes do not reflow the result header

### Requirement: Generation and result behavior remain intact

The visual cleanup SHALL preserve playlist generation, track playback, save,
share, download, track verification, and playlist-name rename behavior. All
interactive controls SHALL retain semantic elements, visible focus, readable
labels/ARIA, and at least the existing touch-target size.

#### Scenario: Existing result interactions still work

- **WHEN** a user plays a track, saves or shares a playlist, downloads it, or
  renames its title
- **THEN** the same handler and success/error state are used as before, apart
  from the removed request-level «Изменить» action

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is enabled during generation or on the
  result screen
- **THEN** decorative motion is reduced/disabled while loading/status feedback
  and control state remain understandable
