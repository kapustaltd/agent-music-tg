## ADDED Requirements

### Requirement: ResultsScreen exposes listening as the primary action

The playlist result screen SHALL expose a primary `Слушать` action that starts
the first currently visible track and passes the visible playlist tracks as the
player queue. When that first track is already playing, the same control MAY
toggle to `Пауза` while retaining its primary position.

#### Scenario: Listen starts the playlist

- **WHEN** the result screen has at least one visible track and the user activates
  `Слушать`
- **THEN** playback starts for the first visible track and the player queue
  contains the visible tracks in playlist order

#### Scenario: Active first track exposes pause

- **WHEN** the first visible track is currently playing
- **THEN** the primary control exposes a pause icon and an accessible label that
  describes pausing the playlist

### Requirement: Download is secondary and explains delivery

The result screen SHALL render download as a compact secondary action. Its
accessible name and tooltip SHALL state that all playlist tracks are sent to the
Telegram chat, including the current track count, and SHALL preserve stable
geometry for idle, sending, sent, and error states.

#### Scenario: Download copy names the number of tracks

- **WHEN** a playlist contains 10 visible tracks
- **THEN** the download action exposes `Скачать 10 треков в чат` as its accessible
  name or equivalent Russian wording

#### Scenario: Download state does not promote itself

- **WHEN** download is idle, sending, sent, or in error
- **THEN** the download action remains secondary and does not become a full-width
  primary row above the track list

### Requirement: Secondary actions are compact and explicit

Save and share SHALL remain available as secondary controls with touch targets of
at least 44×44 CSS pixels. Save SHALL expose `Сохранить в медиатеку` or
`Убрать из медиатеки` depending on state.

### Requirement: Playlist header is compact and wraps safely

At mobile widths up to 560px, the result header SHALL place artwork beside the
playlist name and track count, use a title size no larger than 24px, and allow
long names to wrap without horizontal overflow or hiding the rename control.

#### Scenario: Long playlist name wraps

- **WHEN** the playlist name is longer than the available copy column
- **THEN** the name wraps inside the result content, the edit control stays
  reachable, and the header does not overflow horizontally

### Requirement: Fixed chrome does not cover the last track

The mobile result content SHALL include sufficient bottom reserve for the fixed
mini-player, bottom navigation, and safe-area inset so the final track can be
scrolled fully above those surfaces.

#### Scenario: Last track is reachable

- **WHEN** the user scrolls to the bottom of a multi-track result on a mobile
  viewport
- **THEN** the last track's artwork, title, and artist are visible above the
  fixed navigation and player chrome

### Requirement: Admin is not a primary user tab

The bottom navigation SHALL not include an `Админ` tab. Administrators SHALL be
able to open the existing admin screen from a profile-only secondary entry, and
non-administrators SHALL not see that entry.

#### Scenario: Regular user sees no admin entry

- **WHEN** `me.isAdmin` is false or unavailable
- **THEN** neither the bottom navigation nor the profile screen shows an admin
  entry

#### Scenario: Administrator retains access

- **WHEN** `me.isAdmin` is true and the administrator opens the profile
- **THEN** the profile shows an `Админ-панель` entry that opens the existing admin
  screen
