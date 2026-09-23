## ADDED Requirements

### Requirement: Mini App screens share one neutral palette

The Mini App SHALL use one theme-aware neutral palette for the canvas, surfaces, main and muted text, and separators on every screen. The dark canvas SHALL be `#121212` and the light canvas SHALL be `#EEEEF3`. Shared semantic aliases SHALL resolve to the same palette roles across creation, clarification, results, library, profile, subscription, playback, shared playlist, and admin screens.

#### Scenario: Dark scheme uses shared neutral roles

- **WHEN** a Mini App screen is rendered with the dark scheme
- **THEN** its canvas, surfaces, text, muted text, and separators SHALL resolve through the shared dark palette tokens

#### Scenario: Light scheme uses shared neutral roles

- **WHEN** a Mini App screen is rendered with the light scheme
- **THEN** its canvas, surfaces, text, muted text, and separators SHALL resolve through the shared light palette tokens

### Requirement: Selection and action colors follow the chosen accent

The Mini App SHALL use the profile-selected `--accent` for selected navigation, plans, payment methods, focus treatment, and primary actions. Text on accent-colored controls SHALL use the shared contrast foreground. Accent-colored text in the light scheme SHALL use a theme-aware readable alias. The default accent SHALL remain teal and all existing profile accent presets SHALL remain supported.

#### Scenario: Changing the profile accent updates selected UI

- **WHEN** a user selects another accent in the profile
- **THEN** selected navigation, plans, payment methods, focus indicators, and primary actions SHALL use that same accent family

#### Scenario: Accent foreground remains readable

- **WHEN** accent text or a filled accent control is rendered in either scheme
- **THEN** its text or icon foreground SHALL use the shared scheme-aware contrast token

### Requirement: Semantic and media colors remain intentional

The Mini App SHALL use shared semantic tokens for success, warning, error, and information states. Screen-specific accent colors SHALL NOT replace the selected brand accent. Source colors in album artwork and provider marks, and alpha colors used only for compositing overlays or masks, MAY remain outside the palette tokens.

#### Scenario: Status meaning is preserved across screens

- **WHEN** a success, warning, error, or information state appears
- **THEN** it SHALL use the corresponding semantic status token rather than the screen's selected accent

#### Scenario: Media and compositing colors are preserved

- **WHEN** album artwork, provider marks, masks, or translucent scrims are rendered
- **THEN** their source/compositing colors MAY remain distinct without changing the screen's palette roles
