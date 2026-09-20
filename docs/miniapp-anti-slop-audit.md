# Mini App anti-slop audit

This matrix is the review checklist for the music-first UI pass. A finding is
only retained when it explains a product state, interaction layer, media asset,
or loading/progress state.

| Area | Finding | Decision | Rationale |
| --- | --- | --- | --- |
| `glass.css` ordinary panels | Repeated glass, blur, highlight, border and shadow | simplify | Regular `GlassPanel` content is now a flat layout group; elevation is reserved for menus, sheets and controls. |
| `GlassPanel` | Historical `glass-*` names | simplify | `glass-panel-content` preserves DOM hooks while removing decorative presentation from regular panels. |
| Prompt / AI mode | Persistent assistant chrome and duplicated progress copy | replace | The submitted prompt becomes one compact summary; one status row communicates active generation. |
| Prompt / Search mode | Repeated rounded controls | simplify | Input remains a separated control; suggestions and recent queries use compact 8px controls with 44px hit areas. |
| Results / playlist detail | Card-wrapped track rows | replace | Artwork, title, artist and dividers establish the list hierarchy; actions stay in a secondary menu. |
| Library / artist | Identical cards and row chevrons | simplify | Sections use spacing and list rhythm; artwork and identity provide the visual anchor. |
| Subscription | One plan presented as a selector | replace | A single plan is plain content without a selected checkmark; the purchase CTA is the only accented primary action. |
| Purchase history | Database-like purchase labels | replace | Rows show product/period, paid date and price when available; rows remain flat and divided. |
| Player | Accent used for playback state | intentional exception | Accent marks the active play control, current track and progress because it communicates playback state. |
| Lyrics | Gradient/glow active-line treatment | remove | Active lyrics now use type weight and contrast; no halo or text shadow is needed. |
| Artwork / playlist cover | Decorative placeholder gradient | replace | Real artwork is preserved; user playlist fallback uses a restrained four-swatch music mosaic without glow. |
| Loading / skeletons | Shimmer and spinner | intentional exception | These effects communicate a changing loading state and are disabled or reduced by `prefers-reduced-motion`. |
| Dialogs / sheets / menus | Opaque or blurred elevated surface | intentional exception | Separation from the page is functional layering, not ordinary content decoration. |
| Bottom navigation | Different active treatments | simplify | All tabs share one 44px target, accent icon and restrained tonal active state. |

Reviewed states: prompt idle/submitted, clarify, search results/empty/loading/error,
generated playlist, library/detail, subscription loading/single/multiple/error,
purchase history, player, lyrics loading/not-found/synced, artist loading/error,
profile, shared playlist, admin, menu and payment sheet. The pass preserves
navigation, playback, generation, payment and API behavior.
