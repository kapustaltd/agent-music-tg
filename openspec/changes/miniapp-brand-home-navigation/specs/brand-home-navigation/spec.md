## ADDED Requirements

### Requirement: Header brand returns to the start screen

The Mini App SHALL make the Agent Music header brand a keyboard-accessible
control that returns to the default prompt screen.

#### Scenario: Return home from another screen

- **WHEN** the user activates the header brand from any screen or tab
- **THEN** the Mini App shows the default AI prompt screen with an empty composer
- **AND** the navigation history contains only that start screen
- **AND** transient errors and player or artist overlays are cleared

#### Scenario: Return home while already on the prompt screen

- **WHEN** the user activates the header brand while the prompt screen is showing
- **THEN** the prompt mode resets to its default AI mode and its composer is empty

#### Scenario: Activate the brand with a keyboard

- **WHEN** the header brand button has keyboard focus and the user activates it
- **THEN** the same home navigation occurs
- **AND** the button's focus remains visibly indicated while focused
