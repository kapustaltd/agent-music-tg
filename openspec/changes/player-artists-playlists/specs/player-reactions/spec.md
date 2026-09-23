# player-reactions

## ADDED Requirements

### Requirement: Like button in the player
The fullscreen player SHALL place the Like button to the right of the lyrics action, with the Dislike button to its left. Liking a track SHALL add it to the user's Favorites (`saved_tracks`) and clear any dislike; tapping again SHALL remove it. The button SHALL reflect the current saved state on open.

#### Scenario: Like saves to Favorites
- **WHEN** user taps the Like button while a track plays
- **THEN** the track is saved to Favorites, and the button switches to its active (filled) state

#### Scenario: Unlike removes from Favorites
- **WHEN** user taps the active Like button
- **THEN** the track is removed from Favorites and the button returns to its inactive state

#### Scenario: State reflects persistence
- **WHEN** the player opens for a track already in Favorites
- **THEN** the Like button renders in its active state

#### Scenario: Liking clears a dislike
- **WHEN** user likes a track that is currently disliked
- **THEN** the track is saved to Favorites, its dislike is removed, and only Like is active

### Requirement: Dislike button in the player
The fullscreen player SHALL place the Dislike button to the left of the lyrics action, with Like to its right. Disliking SHALL persist the track in a per-user dislike list. A disliked track SHALL be excluded from future playlist generations for that user. Dislike and Like SHALL be mutually exclusive for a track.

#### Scenario: Dislike persists and advances
- **WHEN** user taps Dislike on the playing track
- **THEN** the track is recorded as disliked and the button shows its active state

#### Scenario: Disliked tracks excluded from generation
- **WHEN** a user with disliked tracks runs a playlist generation
- **THEN** the generated playlist contains none of the user's disliked tracks

#### Scenario: Mutual exclusivity
- **WHEN** user dislikes a track that is currently liked
- **THEN** the track is removed from Favorites and marked disliked

#### Scenario: Legacy state is displayed exclusively
- **WHEN** the player loads a track recorded as both liked and disliked
- **THEN** only Like is shown as active
