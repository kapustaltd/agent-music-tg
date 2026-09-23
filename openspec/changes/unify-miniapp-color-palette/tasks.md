# Tasks: unify-miniapp-color-palette

## 1. Contract

- [x] 1.1 Define the shared two-scheme color roles and their intentional exceptions in the Mini App visual foundation spec.
- [x] 1.2 Update `DESIGN.md` and its Impeccable sidecar to match the Mini App palette and component contract.

## 2. Implementation

- [x] 2.1 Define one set of light/dark canvas, surface, text, muted-text, separator, and accent-foreground tokens in `miniapp/src/styles/glass.css`.
- [x] 2.2 Replace the conflicting warm/olive aliases in `glass.css` and `anti-slop.css` with references to those shared tokens.
- [x] 2.3 Remove bespoke subscription and payment-selection accents; retain only palette accent and semantic status colors for UI states.
- [x] 2.4 Route accent-colored text and filled-control foregrounds through theme-aware contrast aliases while preserving user accent presets.

## 3. Review and verification

- [x] 3.1 Complete a source-based anti-ui-slop color audit and record no more than three material findings with evidence.
- [x] 3.2 Build the Mini App and run the project typecheck.
- [x] 3.3 Render available home/profile states and review the final diff; record any API- or theme-simulation limits.
