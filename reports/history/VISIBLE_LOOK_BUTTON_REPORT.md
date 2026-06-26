# VISIBLE_LOOK_BUTTON_REPORT.md
## Solidarity Not Charity Can Run — Phone-Visible LOOK Button Fix

**Failed commit:** `e82d970` (LOOK in HTML but not reliably visible / overlapped on phone layout)
**New commit:** `25853e5`
**Date:** 2026-06-24

---

## WHAT WAS DONE

1. Backup: `index.before-visible-look-button.html` (151239 bytes)
2. **LOOK (#mlookpad) made unmistakable:**
   - Explicit width/height (portrait ≥72px, landscape ≥68px)
   - `opacity: 1`, `background: rgba(200,150,60,0.35)`, `border: 2px solid rgba(220,190,100,0.80)`
   - Label: LOOK / DRAG
   - `z-index: 12`, `pointer-events: auto` during play
3. **Portrait stack from bottom:** SPRINT (6px) → GIVE (+10px gap) → LOOK (+14px gap above GIVE)
4. **Landscape:** GIVE/SPRINT moved to **left** (`left: 30px`) so LOOK circle on right does not overlap
5. **`?layoutdebug=1`:** yellow outlines + `#id` labels on ml, mlookpad, mg, ms, mm, mp, mr
6. Proof screenshots saved locally (desktop viewport; phone portrait rects verified via `applyMobileControlSettings` math + overlap function)

---

## WHAT WAS VERIFIED

### Static
- backup exists ✓
- syntax OK ✓
- onclick: 0 ✓
- eval: no ✓
- externals: 0 ✓
- title: Solidarity Not Charity Can Run ✓

### Local functional (landscape viewport 1258×622)
- `startRun()` → play ✓
- `__crRuntimeErrors.length` → 0 ✓
- LOOK drag on #mlookpad → angleDelta **0.3** ✓

### Layout / DOM (landscape, after `drawMobileMenu` + `applyMobileControlSettings`)
| Check | Result |
|-------|--------|
| LOOK w×h | 83×83 (≥60) ✓ |
| LOOK display | flex ✓ |
| LOOK pointer-events | auto ✓ |
| LOOK background | rgba(200, 150, 60, 0.35) ✓ |
| lookOverlapsGive | **false** ✓ |
| lookOverlapsSprint | **false** ✓ |
| giveOverlapsSprint | **false** ✓ |
| lookCenterX > 55% viewport | true (1203 > 691) ✓ |
| GIVE position | x:30 (left) ✓ |
| LOOK position | x:1161 (right) ✓ |

### Screenshot proof (local)
- `proof-look-button-landscape.png`
- `proof-look-button-portrait.png` (same viewport as landscape — **phone-sized portrait screenshot not available in headless browser**)
- `proof-look-button-portrait-layoutdebug.png` (layoutdebug outlines visible on controls)

Vision check on landscape proof: LOOK circle visible right side; GIVE/SPRINT on left; yellow outlines when layoutdebug active.

---

## WHAT FAILED

- **True phone-sized portrait viewport** not reproduced in local browser tool (fixed desktop size). Portrait overlap prevention is by **fixed bottom-offset math**, not measured rects at 390×844 in this session.
- **e82d970** on Travis phone: no usable visible LOOK circle (reported).

---

## CURRENT EXACT STATE

- Repo: `solidarity-not-charity-can-run`, branch `main`
- Local `index.html` patched; push pending commit hash below
- MOVE/GIVE/SPRINT/MAP/PAUSE handlers unchanged (per-element only)
- Portrait LOOK depends on `#mlookpad` (`#mr` pointer-events none in portrait)

---

## REMAINING BLOCKERS

- **Real Samsung phone retest** required before claiming LOOK fixed on device
- Portrait layout proof on device: use `?layoutdebug=1` if LOOK not obvious

---

## NEXT ACTIONABLE STEP

Travis opens cache-busted URL, confirms circular LOOK / DRAG on right, drags LOOK, retests all controls.

---

## EVIDENCE

**Proof paths:**
- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-look-button-landscape.png`
- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-look-button-portrait.png`
- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-look-button-portrait-layoutdebug.png`

**Sample rects (landscape local):**
- LOOK: 83×83 @ (1161, 270)
- GIVE: 89×89 @ (30, 217)
- SPRINT: 89×89 @ (30, 378)

---

## GITHUB PAGES URL

**Cache-busted:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=25853e5`

**touchdebug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=25853e5`
**layoutdebug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?layoutdebug=1&v=25853e5`

**Real-phone status:** PENDING Travis retest