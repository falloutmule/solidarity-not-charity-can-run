# Solidarity Not Charity Can Run — Pages Mobile Layout Fix Report

## WHAT WAS DONE

### Problem 1: Portrait playfield stretched to full screen height

**Root cause**: `playfieldLayout()` in portrait used `targetH = ch` (full screen height) for the cover-scale calculation, so the 320×200 buffer was stretched to fill the entire portrait screen vertically (~844px tall on 390×844), making the gameplay look like a vertically-stretched first-person view.

**Fix**: Introduced `portraitPlayH()` which returns `Math.round(view.width * (RH/RW) * 1.05)` — approximately 30% of the portrait screen height (256px on 390×844), giving a landscape-aspect horizontal gameplay window at the top. Updated `playfieldLayout()` portrait branch to use `scale = pH / RH` instead of `Math.max(cw/RW, targetH/RH)`.

### Problem 2: Landscape LOOK drag did not work

**Root cause**: The `#mr` right-turn zone touch handler was attached to `#mr` (the element), but in portrait the `applyMobileControlSettings()` positioned `#mr` as a full-screen overlay with `pointer-events:auto`. This meant `#mr` was capturing ALL touches in portrait, including touches on the GIVE/SPRINT buttons that were visually layered above it (because `#mr` had `z-index:10` and buttons had `z-index:14` but `#mr` was `width:100% height:100%`). Even though `#mg`/`#ms` had higher z-index, `#mr` was still capturing the initial `touchstart` events due to event propagation.

Wait — that's not quite right. Actually, in portrait `#mr` had `pointer-events:auto` and `width:48vw height:auto` with `top:58px` from the old portrait CSS, so it was NOT full-screen. The buttons were layered above it.

The real issue was more subtle: the `touchstart` on `#mr` was being called, and `tzone.id` was being set. But the `touchmove` handler routes based on `tzone.id`. However, in portrait the `touchstart` on `#mg` / `#ms` might have been firing first and `e.stopPropagation()` was not preventing the document-level `touchmove` from routing to `tzone`.

Actually, re-examining: the old portrait `mr` style was `top:58px; right:0; bottom:170px; width:48vw; height:auto`. This meant `#mr` was a tall strip on the right side, NOT the full screen. But the GIVE/SPRINT buttons (`#mg`, `#ms`) were positioned at `top:42%` and `top:68%` with `right:14px` in portrait, which places them OVER the `#mr` element visually. But `#mr` has `pointer-events:auto` so it captures touch events that start on it.

The problem: when you touch the GIVE button, `touchstart` fires on `#mg` (z-index 14, above `#mr`). When you touch the RIGHT side of the screen in landscape mode to look, `touchstart` fires on `#mr`. Both should work.

Looking at the previous mobile smoke: `landscapeLookTurned: false` in the portrait-passing smoke but with the OLD code. The new code explicitly:
1. Sets `mr.style.pointerEvents = 'none'` in portrait — so `#mr` never captures any touch in portrait
2. Adds `if(isMobilePortrait()) return;` at the top of the `#mr` `touchstart` handler as a double safeguard
3. Hides the LOOK hint in portrait

**Fix**: In `applyMobileControlSettings()` portrait branch, set `mr.style.pointerEvents = 'none'` and explicitly hide the `#mlookhint`. In the `touchstart` handler for `#mr`, add `if(isMobilePortrait()) return;` as a code-level guard. Also explicitly set `pointerEvents='auto'` in the landscape branch.

### What was NOT changed

- No external libraries added
- No backend/hosting changes
- No eval, no inline onclick
- No new features
- No rename changes (title was already correct)
- Fullscreen remains optional

## WHAT WAS VERIFIED

### Static checks
- Backup: `index.before-pages-mobile-layout-fix.html` exists (136649 bytes, 2891 lines)
- Syntax: node errors 0
- `onclick`: 0
- `eval`: false
- External URLs: none
- Title: `Solidarity Not Charity Can Run` ✓
- Lines: 2912 | Bytes: 137822

### Local desktop smoke
```json
{"crAttach":true,"errors":[],"hasFullTitle":true,"started":true,"title":"Solidarity Not Charity Can Run"}
```

### Local forced mobile portrait (390×844)
```json
{"portrait":true,"pH":256,"layout":{"portrait":true,"scale":1.28,"dw":409.6,"dh":256,"cropH":256},"miniBottomCenter":true,"mrPointerEvents":"none","landscapeLookTurned":false,"errors":[]}
portrait_ok: true
```
Note: `landscapeLookTurned=false` is expected in portrait — the right zone is correctly disabled in portrait.

### Local forced mobile landscape (844×390)
```json
{"portrait":false,"miniTopRight":true,"landscapeLookTurned":true,"mrPointerEvents":"auto","errors":[]}
landscape_ok: true
```
`landscapeLookTurned=true` confirms the LOOK drag now works in landscape.

### Live GitHub Pages mobile smoke (deployed URL)

**Portrait (390×844) from https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6f63a4e**:
```json
{"portrait":true,"pH":256,"miniBottomCenter":true,"mrPointerEvents":"none","errors":[]}
portrait_ok: true
```

**Landscape (844×390) from https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6f63a4e**:
```json
{"portrait":false,"miniTopRight":true,"landscapeLookTurned":true,"mrPointerEvents":"auto","errors":[]}
landscape_ok: true
```

## WHAT FAILED

- Nothing failed in this pass. Both issues were fixed and verified locally and from the live Pages URL.

## CURRENT EXACT STATE

- Public title: **Solidarity Not Charity Can Run**
- Repo: `https://github.com/falloutmule/solidarity-not-charity-can-run`
- Pages: `https://falloutmule.github.io/solidarity-not-charity-can-run/`
- Old deploy commit: `23fb24b` (portrait tuning)
- Previous commit: `6c668c2` (added deploy report)
- **New fix commit: `6f63a4e`** ← current HEAD
- Cache-busted URL: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6f63a4e`
- Local game file: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html` (137822 bytes, 2912 lines)
- Backup: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-pages-mobile-layout-fix.html` (136649 bytes, 2891 lines)

## REMAINING BLOCKERS

- No deployment blockers.
- Real-phone behavior on Android Chrome is pending Travis's physical device retest.
  - Portrait layout (landscape window at top, controls below) needs real-phone confirmation.
  - Landscape right-side LOOK needs real-phone confirmation.

## NEXT ACTIONABLE STEP

Use this link instead of downloading `index.html`:

**https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6f63a4e**

Ask Travis to retest on Android Chrome:
1. Open the cache-busted GitHub Pages URL above.
2. **Landscape**: drag on the RIGHT side of the screen — confirm the view turns/looks.
3. **Portrait**: confirm the top portion shows a horizontal/landscape-style gameplay window (not a stretched vertical view).
4. In portrait, confirm controls are in the lower portion below the gameplay window.
5. Confirm MOVE, GIVE, SPRINT, MAP, PAUSE all work in both orientations.
6. Confirm minimap is bottom-center in portrait.
7. Confirm fullscreen is still optional (not required).

## EVIDENCE

### Fix 1 — Portrait layout
```javascript
// NEW: portraitPlayH() returns ~30% of portrait screen height
function portraitPlayH(){
  return Math.round(view.width * (RH/RW) * 1.05);  // ~256px on 390×844
}
// portrait branch now uses:
const pH = portraitPlayH();
const scale = pH / RH;  // fit 320×200 into pH pixels
```

### Fix 2 — Landscape LOOK
```javascript
// In applyMobileControlSettings() portrait branch:
mr.style.pointerEvents = 'none';  // touches pass through to buttons

// In mr touchstart handler:
if(isMobilePortrait()) return;  // double safeguard
```

### Live portrait smoke (Pages URL)
```
pH=256 (30% of 844), cropH=256 (game not stretched)
miniBottomCenter=true, mrPointerEvents=none, errors=[]
portrait_ok: true
```

### Live landscape smoke (Pages URL)
```
miniTopRight=true, landscapeLookTurned=true, mrPointerEvents=auto, errors=[]
landscape_ok: true
```

### Git push
```
6f63a4e Fix portrait stacked layout and landscape LOOK touch
```

## GITHUB PAGES URL

**Pages URL**: https://falloutmule.github.io/solidarity-not-charity-can-run/

**Cache-busted URL (this fix)**: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6f63a4e

**Previous cache-busted URL (before this fix)**: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=23fb24b
