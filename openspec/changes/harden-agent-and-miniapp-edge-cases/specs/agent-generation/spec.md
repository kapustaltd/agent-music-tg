## ADDED Requirements

### Requirement: Resumable clarification history
When the agent asks a question, the stored conversation SHALL contain a matched assistant `clarify` call and tool response before the user's answer. Other calls in the same LLM turn SHALL NOT execute or appear in the stored turn.

#### Scenario: Mixed clarify and search
- **WHEN** a provider returns `clarify` and `searchTracks` together
- **THEN** the user receives the question, search does not run, and resume history contains only the paired clarify call and result before the answer.

#### Scenario: Malformed clarification
- **WHEN** a provider supplies an empty question or fewer than three distinct non-empty options
- **THEN** the malformed question is not shown to the user and the model receives a tool error to correct the turn.

### Requirement: An extension adds tracks to earn success
A playlist extension SHALL succeed only when at least one previously absent track URI resolves. An unsuccessful extension SHALL NOT alter the playlist, increment its extension counter, or consume access.
Existing tracks SHALL remain in the playlist even if they were disliked after the playlist was created.

#### Scenario: Backend finds no new track
- **WHEN** every proposed addition is missing, disliked, or already in the playlist
- **THEN** the user receives a retryable no-new-tracks error and keeps the same balance and extension count.

### Requirement: Final tracks are unique
The finalized list SHALL contain each resolved URI at most once, preserving first occurrence order.

#### Scenario: Two names resolve to one recording
- **WHEN** two proposed entries resolve to the same URI
- **THEN** the playlist stores the recording once.

### Requirement: Extension additions survive clarification
An extension SHALL retain additions queued in completed turns before a clarifying question.

#### Scenario: Clarify after adding
- **WHEN** the agent queues a new track and asks a question in the next turn
- **THEN** answering the question and finalizing preserves that track.

### Requirement: Identical calls in one turn share work
The agent SHALL dispatch identical music-tool calls from one LLM turn once and return a corresponding result for every call ID.

#### Scenario: Duplicate search calls
- **WHEN** an LLM turn contains two `searchTrack` calls with equal arguments
- **THEN** the backend receives one search and both call IDs receive tool results.
