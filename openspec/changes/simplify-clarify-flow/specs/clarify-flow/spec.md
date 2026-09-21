# clarify-flow Specification

## ADDED Requirements

### Requirement: Clarify framing is concise and consistent

Mini App SHALL present the clarification screen with the heading «Какую музыку
собрать?» and the helper «Выбери вариант или опиши свой». It SHALL NOT expose a
model-generated explanation as a second question on this screen.

#### Scenario: Options are shown without contradictory copy

- **WHEN** the generation API returns a clarification with options
- **THEN** the Mini App shows one heading, one helper, the options, and the free
  text input without saying that the request is not musical

### Requirement: Selection and generation are separate visual stages

After a user selects an option or submits custom text, the Mini App SHALL hide
the unused options and input and show the selected answer as compact context
above the generation status. The generation status SHALL remain visually
secondary to the selected context and SHALL not look like another screen title.

#### Scenario: Busy clarification does not show two stages at once

- **WHEN** a clarification answer is being submitted
- **THEN** the screen shows the selected answer, a disabled «Изменить» affordance,
  and the progress/tracks preview, but not the unselected options or input

### Requirement: Clarify copy is natural Russian

Clarification options SHALL be short, concrete music directions in natural
Russian. They SHALL avoid literal model phrasing, unnecessary explanations,
and inconsistent «ты»/«вы» forms.

#### Scenario: Agent receives copy constraints

- **WHEN** the agent is asked to produce clarification options
- **THEN** its tool guidance requests concise user-facing directions such as
  «Дерзкие хиты», not abstract or awkward constructions

### Requirement: Simplification preserves interaction safety

The flow SHALL preserve option selection, custom text submission, generation
progress, track preview playback, focus visibility, and reduced-motion behavior.

#### Scenario: Custom answer remains available before selection

- **WHEN** the screen is idle and the user types a custom answer
- **THEN** the answer can be submitted with Enter or the send control, and the
  selected-answer state replaces the input while the request is busy
