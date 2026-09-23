# generation-loading

## Requirement: Spinner-only loading status

While generation or clarification is busy, the visual status MUST contain only Swirl. It MUST NOT show ThoughtLine, elapsed time, phase text, or a collapsible trace. The status MUST have an accessible Russian name.

### Scenario: Waiting for the first result

- **WHEN** the progress stream has no tracks
- **THEN** the Mini App shows Swirl without other visual status content

### Scenario: Tracks arrive

- **WHEN** progress events contain tracks
- **THEN** Swirl remains visible and the existing deduplicated preview rows remain available

### Scenario: Reduced motion

- **WHEN** reduced motion is requested
- **THEN** Swirl remains visible without continuous animation
