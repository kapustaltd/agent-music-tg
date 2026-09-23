# Mobile Interactions Specification

## ADDED Requirements

### Requirement: Mini App controls work as touch-first controls

Every actionable control in the Mini App SHALL be operable by touch without requiring hover, and SHALL provide a clear pressed, selected, disabled, or loading state. Phone hit areas SHOULD use the product target of at least 44×44 CSS px when controls are not in an essential dense layout; expanded areas SHALL NOT overlap neighboring actions.

#### Scenario: Primary action is comfortable to tap

- **WHEN** a user taps the composer, navigation, player, playlist, shop, profile, or admin control on a phone
- **THEN** the whole visible affordance is responsive, distinct from adjacent targets, and provides immediate non-motion state feedback

#### Scenario: Hover-only action remains available

- **WHEN** a user opens a Mini App screen on a touch device that cannot hover
- **THEN** every action available on desktop hover can still be found and activated through an always-visible touch control or menu

### Requirement: Mobile layout respects content gutters and WebView insets

The Mini App SHALL keep primary text, fields, and controls inset from phone edges and account for Telegram WebView safe areas and the software keyboard. A viewport of 320 CSS px SHALL not create unintended horizontal overflow or clipped controls.

#### Scenario: Composer remains inset at narrow width

- **WHEN** the prompt composer is rendered at 320–390 CSS px
- **THEN** its text, send control, and focus treatment remain legible and do not sit against or clip at the viewport edge

#### Scenario: Search hint remains readable at the smallest width

- **WHEN** search mode is selected at 320 CSS px
- **THEN** the full two-line field hint remains visible inside the composer

#### Scenario: Section action wraps before it clips

- **WHEN** the playlist heading and its primary action do not fit on one line
- **THEN** the action moves to a second line and remains fully visible and tappable

#### Scenario: Keyboard and safe area do not cover an action

- **WHEN** a user focuses a text field or reaches the bottom of a long view in Telegram WebView
- **THEN** the focused field and relevant primary action remain visible above the keyboard and device safe area

### Requirement: Gestures complement visible controls and preserve scrolling

Supported gestures SHALL have a visible control alternative and SHALL not prevent native vertical scrolling, text selection, nested horizontal rail movement, or system/Telegram navigation. A swipe may dismiss a player or sheet only after a clear axis and distance threshold is met.

#### Scenario: Swipe and tap coexist in the full player

- **WHEN** a user drags vertically on the non-interactive player surface
- **THEN** a deliberate downward gesture dismisses the player, while a tap, horizontal drag, seek interaction, or scrollable-content gesture remains usable

#### Scenario: Horizontal collections remain discoverable

- **WHEN** more items exist than fit in a horizontal recommendation/history rail
- **THEN** the rail can be moved by touch and keyboard, and a partial next item or equivalent visual cue indicates additional content

#### Scenario: Dismissible sheet keeps its close action

- **WHEN** a supported bottom sheet is shown
- **THEN** the explicit close action remains reachable even if swipe-to-dismiss is also available

### Requirement: Motion reinforces actions and state changes

Interactive state feedback and screen/overlay transitions SHALL use the established short motion vocabulary and avoid layout shifts. Animation SHALL have a clear static state equivalent and SHALL respect `prefers-reduced-motion`.

#### Scenario: User receives feedback after an action

- **WHEN** the user taps a button, changes a mode, switches a tab, opens or closes a screen, or toggles playback/save state
- **THEN** the updated state is apparent immediately through text, icon, color, or structure, with a brief animation only where it improves continuity

#### Scenario: Reduced-motion setting is enabled

- **WHEN** `prefers-reduced-motion: reduce` is active
- **THEN** movement is removed or replaced with an opacity or instant transition, while the result of each action remains clear

### Requirement: Decorative rules do not subdivide every list row

Repeated horizontal borders SHALL NOT be the default grouping method for similar playlist, library, search, or result rows. Space and interaction states SHALL define grouping; progress, seek, focus, selected, and genuinely structural indicators MAY keep their lines.

#### Scenario: Repeated rows use spacing and state

- **WHEN** a list of similar tracks or media items is rendered
- **THEN** adjacent rows are distinguishable through alignment, touch response and vertical rhythm without a full-width decorative separator under every row
