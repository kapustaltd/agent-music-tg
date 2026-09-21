# prompt-composer Specification

## ADDED Requirements

### Requirement: No redundant prompt heading

The create screen SHALL not render the heading «Что хочется послушать?» above
the prompt field. The prompt field placeholder and mode control remain the
visible orientation cues.

#### Scenario: AI mode opens

- **WHEN** the create screen opens in «Подобрать» mode
- **THEN** the redundant heading is absent and the mode switch plus prompt field
  are immediately available

### Requirement: Shared mode segmented control

The «Подобрать / Поиск» mode selector SHALL use the same `Segmented` component,
active indicator treatment, fill layout, and keyboard selection behavior as the
«Источник треков» selector.

#### Scenario: Switch mode by touch

- **WHEN** the user taps «Поиск» or «Подобрать»
- **THEN** the active indicator moves to that option and the corresponding mode
  body is rendered

#### Scenario: Switch mode by keyboard

- **WHEN** the mode selector has focus and the user presses an arrow key
- **THEN** selection follows focus using the shared segmented-control behavior

### Requirement: Full-width mobile prompt field

The prompt input surface SHALL span the mobile viewport width on narrow screens,
while the mode selector, suggestions, and search results retain readable gutters.

#### Scenario: Narrow mobile viewport

- **WHEN** the create screen is rendered at 320–430px wide
- **THEN** the prompt field reaches both viewport edges without causing horizontal
  scrolling

#### Scenario: Desktop viewport

- **WHEN** the create screen is rendered at desktop width
- **THEN** the existing desktop composer layout and readable content width remain
  unchanged
