# generation-loading

## Requirement: Thinking and loading feedback

While playlist generation or clarification is busy, the Mini App MUST show an animated thinking line with Russian labels for the current public SSE phases, a timer, and a Swirl loading indicator. The phase trace MUST be collapsible and keyboard accessible.

### Scenario: No events yet

- **WHEN** generation starts before the first progress event
- **THEN** the status shows a Russian initial phase and Swirl

### Scenario: Events and tracks arrive

- **WHEN** progress events add phases and track previews
- **THEN** the thinking trace updates from the public phases, and the existing deduplicated track preview remains usable

### Scenario: Reduced motion

- **WHEN** reduced motion is requested
- **THEN** continuous motion stops while the text and tracks remain readable

## Requirement: Local preview

In development, `?preview=loading` MUST display sample loading states without Telegram authorization or API calls. Production MUST use the normal App for that query.
