# Web UI cleanup and layout Specification

## Requirements

### Requirement: Header has one clear action for each concern

The Mini App SHALL show one icon-only search action, one visible brand name, one profile action, and the generation balance. It SHALL NOT show a theme toggle or a second profile action in the same navigation frame.

#### Scenario: Narrow mobile header

- **WHEN** the app renders at a narrow mobile width
- **THEN** the search icon, brand name, profile action, and balance fit without clipping or horizontal scroll

### Requirement: Profile is not duplicated in navigation

The profile screen SHALL be reachable from the header and SHALL NOT appear as a tabbar item. The tabbar SHALL not mark an unrelated tab active while profile/help is open.

### Requirement: Decorative rail copy is absent

The main navigation SHALL NOT render the decorative “Музыка без аккаунтов” source note. Product sources MAY remain in relevant content or settings where they help a decision.

### Requirement: Navigation transition is stable

Screen navigation SHALL use a bounded opacity transition without ambient gradient layers or horizontal layout movement. The transition SHALL not produce a visible flash, gradient flare, or persistent outgoing screen.

### Requirement: Help and shop copy is concise

The shop heading SHALL not repeat “Подписка на сервис”. The help action area SHALL not render “Нужна ещё помощь?” or the explanatory sentence about repeating onboarding/support, while the two underlying actions remain available.

### Requirement: Web layout is content-led

At desktop width, the Mini App SHALL use a music-oriented rail/main/optional-now-playing composition. Decorative prompt illustrations SHALL not occupy a standalone content column when real music content is available.

### Requirement: Mobile layout remains usable

At 320px width, controls SHALL retain readable labels, visible focus, usable touch targets, and no horizontal overflow. Desktop-only rails SHALL be hidden or collapsed structurally rather than squeezed into the mobile layout.
