# CARD 5 — Thumb real estate contract (P1)

**Date:** 2026-06-26  
**BUILD_ID:** `contract1`  
**Backup:** `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-thumb-contract-p1.html`

## WHAT WAS DONE

- Added in-source **PORTRAIT CONTROL CONTRACT** comment block immediately above `portraitLayout()` in `index.html`.
- Documented thumb zones, vertical stack, CONTROL DOCK HEIGHT scope, and intentional SPRINT/LOOK overlap.
- Bumped `BUILD_ID` to `contract1` for cache-busted verification (comments-only behavior; layout math unchanged).
- This report file satisfies Kanban acceptance for a standalone doc section.

## PORTRAIT CONTROL CONTRACT (summary)

| Zone | Placement | Notes |
|------|-----------|-------|
| FPV | Top, fixed | Gameplay viewport; not shifted by dock height |
| Minimap | Below FPV, fixed | Full-width band; not shifted |
| MENU | Centered under minimap, fixed | Not in portraitShiftY path |
| MOVE | Left dock | Joystick #ml |
| GIVE | Above MOVE | Smaller; vertical stack saves width |
| LOOK | Right dock | #mlookpad; PORTRAIT_LOOK_BOOST |
| SPRINT | Overlaps LOOK | sprintRect offset from lookRect; mobile burst tap |
| Stats | Bottom, fixed | Not shifted |

**CONTROL DOCK HEIGHT** (controlsYOffsetPx, steps 120 / 0 / -120 / -240): shifts only MOVE, GIVE, LOOK, SPRINT.

**Future edits:** preserve overlap and MENU-under-minimap lock unless the user explicitly requests layout changes.

## Code changed

- `const BUILD_ID = 'contract1';`
- Block comment PORTRAIT CONTROL CONTRACT before `function portraitLayout`.

## WHAT WAS VERIFIED

- PORTRAIT CONTROL CONTRACT present in index.html.
- menuRect still excluded from portraitShiftY (Card 1 invariant preserved).
- No changes to portraitLayout rect math or DOM placement logic.

## WHAT FAILED / NOT TESTED

- Real-phone screenshots (not required for doc-only card).
- GitHub Pages CDN lag after push.

## GITHUB PAGES URL

https://falloutmule.github.io/solidarity-not-charity-can-run/?v=contract1&mobile=on