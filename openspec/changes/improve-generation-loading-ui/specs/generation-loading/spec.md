# generation-loading Specification

## Purpose

Loading-состояние генерации должно объяснять, что происходит, и показывать найденную музыку без декоративного шума.

## Requirements

### Requirement: Loading status has a readable hierarchy

While playlist generation is in progress, the Mini App MUST show the current agent phase as the primary status and the number of already found tracks as secondary information.

#### Scenario: No tracks have arrived yet

- **WHEN** generation is busy and the progress stream has no track previews
- **THEN** the UI shows a phase such as `Ищу подходящие треки` and the detail `Подбор начался`

#### Scenario: Track previews have arrived

- **WHEN** generation is busy and one or more progress events include tracks
- **THEN** the UI shows the latest phase separately from a correctly pluralized found-track count

### Requirement: Preview rows remain useful and quiet

The loading preview MUST keep artwork, title, artist, keyboard/touch activation and playback behavior. It MUST NOT render card borders, horizontal divider strips, repeating-gradient stripes, or a fake percentage progress bar.

#### Scenario: User taps a found track

- **WHEN** a preview row is activated
- **THEN** the existing player toggles that track using the preview queue

#### Scenario: More tracks arrive

- **WHEN** a later progress event adds tracks already shown or new tracks
- **THEN** the preview deduplicates by URI and keeps at most six rows

### Requirement: Request context does not become a second loading surface

The collapsed request MUST remain readable while busy, but its loading presentation MUST NOT add a decorative divider beneath it or create a second card-like surface.

#### Scenario: Generation is in progress

- **WHEN** `prompt-card--busy` is present
- **THEN** the request summary has no bottom divider and the status follows it with intentional spacing

### Requirement: Loading remains responsive and accessible

The loading status MUST wrap safely on narrow viewports, keep readable contrast and touch targets, and honor reduced-motion preferences.

#### Scenario: Narrow viewport

- **WHEN** the available width is 320–480 CSS pixels
- **THEN** status text and track metadata remain inside the viewport without horizontal scrolling

#### Scenario: Reduced motion

- **WHEN** `prefers-reduced-motion: reduce` is enabled
- **THEN** the activity indicator stops moving while the phase text and found tracks remain visible

### Requirement: Existing generation behavior is preserved

The change MUST NOT alter the generation API, progress event parsing, navigation, or final playlist behavior.

#### Scenario: Generation completes

- **WHEN** the API returns a finalized playlist
- **THEN** the app navigates to the existing results screen with the same tracks and actions
