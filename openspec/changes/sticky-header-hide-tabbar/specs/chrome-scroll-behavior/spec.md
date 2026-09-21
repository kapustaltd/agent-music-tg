## ADDED Requirements

### Requirement: Sticky app header

The Mini App SHALL keep the primary app header attached to the top of the viewport while the page scrolls.

#### Scenario: Header remains visible during mobile scroll

- **WHEN** the user scrolls down the Mini App on a mobile viewport
- **THEN** `.app-top-bar` SHALL remain visible at the top safe-area offset
- **AND** the header SHALL keep its readable backdrop over content passing underneath it

#### Scenario: Header does not shift document layout

- **WHEN** the header becomes sticky
- **THEN** the first content block SHALL not jump or gain a duplicate header spacer

### Requirement: Hide tabbar on downward scroll

The mobile bottom tabbar SHALL hide after an intentional downward scroll without changing the document layout.

#### Scenario: Ignore scroll jitter

- **WHEN** the viewport moves downward by less than 16px in accumulated distance
- **THEN** the tabbar SHALL remain visible

#### Scenario: Hide after downward scroll intent

- **WHEN** the viewport is below 24px from the top and accumulated downward movement reaches 16px
- **THEN** the tabbar SHALL receive the hidden visual state
- **AND** it SHALL move below the viewport with a transform/opacity transition
- **AND** the reserved bottom space SHALL remain unchanged

#### Scenario: Desktop rail remains available

- **WHEN** the same scroll state occurs on a viewport at least 840px wide
- **THEN** the desktop navigation rail SHALL remain visible and usable

### Requirement: Reveal tabbar at the top

The mobile tabbar SHALL return when the user reaches the top of the page.

#### Scenario: Fling to top

- **WHEN** the viewport reaches `scrollY <= 24px`
- **THEN** the tabbar SHALL become visible again
- **AND** the downward-distance accumulator SHALL reset

#### Scenario: Scroll up without reaching top

- **WHEN** the user scrolls upward but remains below 24px from the top
- **THEN** the tabbar MAY remain hidden until the top threshold is reached

### Requirement: Respect reduced motion

The chrome behavior SHALL respect the user's reduced-motion preference.

#### Scenario: Reduced motion is enabled

- **WHEN** `prefers-reduced-motion: reduce` matches
- **THEN** tabbar visibility SHALL still update correctly
- **AND** the hide/show transition SHALL not animate
