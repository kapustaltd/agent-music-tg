# anti-slop-ui Specification

## ADDED Requirements

### Requirement: Slop findings are audited with context

The Mini App SHALL have a repeatable audit of `miniapp/src`, shared components, screens, and rendered key states against the Impeccable Slop catalog. Every finding SHALL be marked `remove`, `simplify`, `replace`, or `intentional exception` with a short product-specific rationale.

#### Scenario: Audit covers source and rendered states

- **WHEN** the anti-slop pass is reviewed
- **THEN** it includes the shared stylesheet, shared UI components, every Mini App screen, and the prompt/results/player/loading/empty/error/dialog states, not only the first screen

#### Scenario: Remaining finding has a rationale

- **WHEN** an Impeccable finding remains after the pass
- **THEN** the audit records why it communicates product state, layering, media, progress, focus, or another concrete user need

### Requirement: Ordinary surfaces have a single visual hierarchy

Ordinary content groups SHALL NOT use decorative glassmorphism, stacked cards, or redundant surface treatments. A border and a shadow SHALL NOT both compete to define the same card boundary, and a colored side stripe SHALL be used only for a meaningful status or warning.

#### Scenario: Nested decorative cards are flattened

- **WHEN** a screen renders a card or panel containing another card with no independent interaction or status
- **THEN** the inner container is replaced by spacing, typography, a divider, or a single shared surface

#### Scenario: Glass effect is limited to a real layering need

- **WHEN** an ordinary panel, row, input, or button is rendered
- **THEN** it does not rely on backdrop blur/saturation, glow borders, or a highlight overlay to look finished; blur may remain for an overlay/scrim or another documented layering need

### Requirement: Decorative color and shape choices are purposeful

The Mini App SHALL NOT use background halos, gradient text, neon accents, repeating decorative stripes, or extreme pill radii solely to signal that a section is important. Gradients, rounded shapes, and accent color MAY remain when they identify artwork, loading, focus, progress, status, or a clearly interactive control.

#### Scenario: Content receives emphasis through hierarchy

- **WHEN** a heading, CTA, or important result needs emphasis
- **THEN** emphasis comes primarily from content, contrast, type scale, spacing, or a semantic state instead of a decorative glow or gradient applied by default

#### Scenario: Media and loading exceptions remain usable

- **WHEN** artwork, an image placeholder, or a loading skeleton is rendered
- **THEN** its visual treatment remains stable and legible, and it is not removed merely because it uses a gradient or mask with a documented functional purpose

### Requirement: Typography and layout communicate content hierarchy

Headings, body text, labels, and metadata SHALL have visibly distinct roles. Redundant labels above a heading, icon tiles stacked above every heading, identical card grids for unrelated content, monotonous spacing, unreadably small essential text, and uncomfortable line lengths SHALL be removed or corrected.

#### Scenario: Heading is not preceded by redundant decoration

- **WHEN** a screen renders a heading with a badge, eyebrow, or icon tile above it
- **THEN** that element either adds unique information or is removed/repositioned so the heading and its action remain the primary scan path

#### Scenario: Related content is grouped by meaning

- **WHEN** a screen renders multiple sections, rows, or cards
- **THEN** related items are closer to each other than unrelated groups, and layout variation reflects content importance instead of giving every item identical visual weight

#### Scenario: Essential text stays readable on mobile

- **WHEN** the Mini App renders at a 320px-wide viewport
- **THEN** essential labels, actions, body copy, and metadata remain readable, do not touch the viewport edge, and do not cause horizontal overflow or clipping

### Requirement: Motion communicates a changing state

Static status indicators SHALL remain still. The Mini App SHALL NOT use decorative blinking cursors, auto-scrolling marquees, bounce/elastic easing for routine actions, or hover motion that does not clarify an interaction. Motion for active playback, generation, progress, or navigation MAY remain when it does not shift surrounding layout.

#### Scenario: Inactive status is visually stable

- **WHEN** a status dot or label represents a state that is not changing
- **THEN** it does not pulse or blink continuously

#### Scenario: Reduced motion is respected

- **WHEN** `prefers-reduced-motion: reduce` is enabled
- **THEN** decorative transitions and animations are disabled or reduced to an immediate state change while controls and state feedback remain usable

### Requirement: User-facing copy and imagery are specific

Russian UI copy SHALL state what the user can do or what happened. Repeated labels, generic marketing claims, forced contrast slogans, and decorative em-dash-heavy phrasing SHALL be removed when they do not improve a decision. Placeholder-like illustrations SHALL be replaced with a meaningful asset or omitted.

#### Scenario: Empty and error states explain the next action

- **WHEN** an empty or error state is shown
- **THEN** it contains concise Russian explanation and, where applicable, a concrete next action instead of generic promotional copy

#### Scenario: Decorative illustration has a product role

- **WHEN** a non-content illustration is shown
- **THEN** it communicates the music workflow or a state; otherwise the layout works without it

### Requirement: Cleanup preserves behavior and accessibility

The anti-slop pass SHALL preserve navigation, playback, generation, payment, admin, and API behavior. Interactive controls SHALL retain semantic elements, keyboard focus visibility, readable contrast, and usable touch targets.

#### Scenario: Existing user flow remains intact

- **WHEN** a user creates a playlist, searches, opens a track/player, visits profile/shop/admin, or completes an existing action
- **THEN** the action and its success/error/loading states behave as before, apart from the intended visual simplification

#### Scenario: Focus remains visible after surface simplification

- **WHEN** a keyboard user focuses a button, input, tab, or dialog control
- **THEN** a visible focus indicator remains distinguishable from the surrounding surface and is not removed as decorative chrome
