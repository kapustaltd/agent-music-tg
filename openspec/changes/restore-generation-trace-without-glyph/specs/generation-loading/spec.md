# generation-loading

## Requirement: Trace without decorative glyph

While generation or clarification is busy, the Mini App MUST show Swirl, a running timer, and a collapsible trace of Russian public SSE phases. ThoughtLine MUST NOT render a decorative glyph before its label.

### Scenario: First event has not arrived

- **WHEN** generation starts
- **THEN** Swirl, the timer and an initial Russian phase are visible

### Scenario: Progress arrives

- **WHEN** progress events add phases and track previews
- **THEN** the trace updates and the existing deduplicated track rows remain available

### Scenario: User folds the trace

- **WHEN** the trace header is activated by click or keyboard
- **THEN** its steps hide or reappear without stopping the timer

### Scenario: Reduced motion

- **WHEN** reduced motion is requested
- **THEN** continuous motion in the line stops while text remains readable
