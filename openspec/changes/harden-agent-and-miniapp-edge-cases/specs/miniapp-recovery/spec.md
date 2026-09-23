## ADDED Requirements

### Requirement: Library load failure is recoverable
The Mini App SHALL distinguish a failed request for saved playlists, tracks, saved generations, or downloads from a successful empty response and offer retry. Download polling SHALL stop after bounded backoff on repeated failure.

#### Scenario: Playlist request fails
- **WHEN** the playlist API request rejects
- **THEN** the screen shows an error and retry action rather than "Пока нет плейлистов".

### Requirement: Checkout action is visible
Each available subscription plan SHALL indicate that selecting it opens payment options.

#### Scenario: One configured plan
- **WHEN** the shop lists a single 30-day plan
- **THEN** the user can identify the next action without guessing whether the card is interactive.

### Requirement: Bottom navigation masks scrolling content
On mobile, the fixed bottom navigation SHALL have an opaque background through the bottom safe area while retaining its current interactive position.

#### Scenario: Content scrolls beneath the dock
- **WHEN** a long music or profile screen is scrolled
- **THEN** its text and controls are not visible through the navigation surface.

### Requirement: The narrow composer remains readable
At 320 px width, the prompt placeholder SHALL remain fully visible, the unselected search mode SHALL have readable contrast, and example chips SHALL truncate long text visibly. The example heading SHALL describe prompts rather than moods alone.

#### Scenario: Narrow create screen
- **WHEN** the create screen opens at 320 px width
- **THEN** the placeholder stays on one line, the search mode looks available, and long examples show an ellipsis.
