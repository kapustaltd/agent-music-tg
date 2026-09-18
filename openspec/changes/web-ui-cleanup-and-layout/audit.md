# Anti-slop audit matrix

| Finding | Decision | Rationale |
| --- | --- | --- |
| Header theme toggle | remove | User requested one focused chrome; system/saved scheme still applies. |
| Header search pill | simplify | Icon-only search preserves the action and releases width for the brand on mobile. |
| Duplicate profile tab/action | remove | Profile belongs to the header; duplication weakens navigation hierarchy. |
| Dock source note | remove | Copy-only decoration; source selection already exists in profile/settings. |
| Desktop prompt-context orbit artwork | remove | Decorative illustration does not communicate current music state or user data. |
| Ambient body/app gradient | remove | Produces transition flare and competes with music content. |
| Screen opacity cross-fade | intentional exception | Explains navigation state change; must remain bounded and layout-stable. |
| Artwork / progress / skeleton gradients | intentional exception | These represent media, playback progress, or loading state. |
| FAQ and support actions | keep | They answer user questions and provide recovery/support actions. |
