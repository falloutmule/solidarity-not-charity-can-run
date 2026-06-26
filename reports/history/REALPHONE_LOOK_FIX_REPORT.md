# Solidarity Not Charity Can Run — Real-Phone LOOK Fix Report

## WHAT WAS DONE

### Root Cause Diagnosis

Synthetic CDP tests said LOOK worked, but real phone said it didn't. The handoff required instrumentation before guessing further.

**Added debug mode**: `?touchdebug=1` activates a semi-transparent overlay showing:
- Current orientation (portrait/landscape)
- All control zone bounds and `pointer-events` state
- Current `player.angle`
- `mobileMode` / `isMobilePortrait` state
- Inner dimensions

**Key discovery**: `setPointerCapture` throws `NotFoundError` on synthetic CDP events (pointerId not recognized as "active" by Chrome's synthetic event system). This was masking whether the actual pointer routing worked.

### Fix 1: Portrait LOOK — dedicated `#mlookpad` zone

**Root cause**: Portrait had no dedicated LOOK area. The old `#mr` was set to `pointer-events:none` (which was correct for making GIVE/SPRINT accessible), but nothing replaced it for portrait look.

**Fix**:
- Added `<div id="mlookpad">` inside `#mob` as a dedicated portrait LOOK touch area
- Positioned it between the left joystick and right buttons, below the gameplay window
- Unified pointer event handler (pointerdown/pointermove/pointerup) on `#mlookpad`
- Uses `setPointerCapture` (wrapped in try/catch for safety)
- `applyMobileControlSettings()` now positions `#mlookpad` in portrait, hides it in landscape

### Fix 2: Landscape LOOK — pointer event unification

**Root cause**: The landscape `#mr` zone only had `touchstart` wired. On real phones, Chrome's touch-to-pointer unification can cause the initial `touchstart` to not properly initialize the `tzone` state if the synthetic `setPointerCapture` fails silently.

**Fix**:
- Added unified `pointerdown/pointermove/pointerup` handlers on `#mr` (landscape only)
- These mirror the existing `touchstart/touchmove` handlers but use pointer events
- `setPointerCapture` wrapped in try/catch (real phone pointer capture works fine; only synthetic CDP test events fail)
- Guard `if(e.pointerType === 'mouse' && !mobileMode) return` prevents desktop pointer-lock interference

### Fix 3: `mlookpad` look sensitivity and hint

- Portrait look uses `options.mobileTurnSens` (same sensitivity as landscape)
- `dismissLookHint()` called on first look drag
- Hint text "DRAG TO LOOK" shown in the look pad area

### What was NOT changed

- GitHub Pages hosting unchanged
- No external libraries
- No backend
- No build system
- Single `index.html`
- Title unchanged
- Sprint/move/map/pause all unchanged

## WHAT WAS VERIFIED

### Static checks
- Backup: `index.before-realphone-look-fix.html` exists (137822 bytes)
- `onclick`: 0
- `eval`: 0
- External URLs: none
- Title: `Solidarity Not Charity Can Run` ✓
- Lines: 3064 | Bytes: 144993

### Desktop smoke (local)
```
{"errors":[],"keyMoved":false,"started":true,"title":"Solidarity Not Charity Can Run"}
```

### Local forced mobile portrait (390×844) — local server
```
portrait=true
mlookpad: {l:134, t:256, w:147, h:465, pe:auto}
mr: {l:0, t:0, w:390, h:844, pe:none}
yaw0:0.7854, yaw1:1.0854
portLookDelta:0.3
portLookWorked:true
errors:[]
portrait_ok:true
```

### Local forced mobile landscape (844×390) — local server
```
portrait=false
mr: {l:422, t:0, w:422, h:390, pe:auto}
yaw0:0.7854, yaw2:1.0854
landLookDelta:0.3
landLookWorked:true
errors:[]
landscape_ok:true
```

### Live GitHub Pages portrait (390×844) — `?v=863cc24` + mobile metrics
```
mobileMode:true, isMobilePortrait:true
mlookpad: {l:134, t:256, w:147, h:465, pe:auto}
mr: {pe:none}
yaw0:0.7854, yaw1:1.0854
portLookDelta:0.3
portLookWorked:true
errors:[]
```

### Live GitHub Pages landscape (844×390) — `?v=863cc24` + mobile metrics
```
mobileMode:true, isMobilePortrait:false
mr: {l:422, t:0, w:422, h:390, pe:auto}
yaw0:0.7854, yawAfterLook:1.0854
landLookDelta:0.3
landLookWorked:true
errors:[]
```

## WHAT FAILED

- Nothing in this pass. Both LOOK mechanisms pass in synthetic mobile emulation and from the live GitHub Pages URL.

## CURRENT EXACT STATE

- **GitHub issue**: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
- **Repo**: `https://github.com/falloutmule/solidarity-not-charity-can-run`
- **Pages**: `https://falloutmule.github.io/solidarity-not-charity-can-run/`
- **New fix commit**: `863cc24` ← current HEAD
- **Cache-busted URL**: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=863cc24`
- **Debug URL**: `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=863cc24`
- **Previous commits**: `c02b282` (report), `6f63a4e` (layout fix), `23fb24b` (initial rename)
- **Local file**: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html` (144993 bytes, 3064 lines)
- **Backup**: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-realphone-look-fix.html` (137822 bytes)

## REMAINING BLOCKERS

- Synthetic mobile emulation (headless Chrome CDP) still cannot test real phone pointer behavior accurately. `setPointerCapture` fails on synthetic pointer events in CDP.
- Real-phone behavior on actual Android Chrome is **pending Travis's physical device retest**. Emulation is not the same as real hardware.

## NEXT ACTIONABLE STEP

Use this link instead of downloading `index.html`:

**https://falloutmule.github.io/solidarity-not-charity-can-run/?v=863cc24**

**Debug URL** (if normal LOOK fails): `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=863cc24`

Ask Travis to retest on Android Chrome:

1. Open `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=863cc24`
2. **Landscape**: drag on the RIGHT side — confirm the view turns left/right
3. **Portrait**: drag in the CENTER area (between MOVE and GIVE/SPRINT) — confirm the view turns
4. Confirm MOVE joystick works in both orientations
5. Confirm GIVE, SPRINT, MAP, PAUSE all work
6. If LOOK still fails, open the debug URL and send a screenshot showing the yellow debug overlay

## EVIDENCE

### Portrait lookpad DOM
```
mlookpad: found: DIV
mobChildren: ["ml","mlookpad","mr","mg","ms","mm","mp"]
```

### Portrait look delta (live Pages, mobile portrait)
```
yaw0:0.7854, yaw1:1.0854
portLookDelta:0.3  (delta = +0.3 radians on 60px drag = correct mobileTurnSens)
portLookWorked:true
```

### Landscape look delta (live Pages, mobile landscape)
```
yaw0:0.7854, yawAfterLook:1.0854
landLookDelta:0.3
landLookWorked:true
```

### Key code changes

**New `#mlookpad` element**:
```html
<div id="mlookpad" class="mbtn" aria-hidden="true">
  <div id="mlookpadhint">DRAG TO LOOK</div>
</div>
```

**Portrait CSS**:
```css
#mlookpad{
  position:absolute;left:0;right:0;bottom:0;top:0;
  border-radius:0;background:transparent;border:none;
  display:flex;align-items:center;justify-content:center;
  touch-action:none; z-index:9;
}
```

**Portrait positioning in `applyMobileControlSettings()`**:
```javascript
if(portrait){
  const pH = typeof portraitPlayH==='function' ? portraitPlayH() : ...;
  mlookpad.style.top = pH + 'px';
  mlookpad.style.bottom = ...;
  mlookpad.style.left = (joySize + 24) + 'px';
  mlookpad.style.right = (btnSize + 24) + 'px';
  mlookpad.style.display = '';
} else {
  mlookpad.style.display = 'none';
}
```

**Portrait pointer look**:
```javascript
lpad.addEventListener('pointerdown', e=>{
  if(!isMobilePortrait()) return;
  e.preventDefault(); e.stopPropagation();
  lpadPtr = { id: e.pointerId, startX: e.clientX };
  try { lpad.setPointerCapture(e.pointerId); } catch(_){}
},{passive:false});
lpad.addEventListener('pointermove', e=>{
  if(!lpadPtr || e.pointerId !== lpadPtr.id) return;
  const dx = e.clientX - lpadPtr.startX;
  if(Math.abs(dx) > 1){ lpadPtr.startX = e.clientX; }
  player.angle += dx * options.mobileTurnSens;
},{passive:false});
```

**Landscape pointer look**:
```javascript
mr.addEventListener('pointerdown', e=>{
  if(isMobilePortrait()) return;
  if(e.pointerType === 'mouse' && !mobileMode) return;
  e.preventDefault(); e.stopPropagation();
  mrPtr = { id: e.pointerId, startX: e.clientX };
  try { mr.setPointerCapture(e.pointerId); } catch(_){}
},{passive:false});
mr.addEventListener('pointermove', e=>{
  if(!mrPtr || e.pointerId !== mrPtr.id) return;
  const dx = e.clientX - mrPtr.startX;
  if(Math.abs(dx) > 0.5){ mrPtr.startX = e.clientX; }
  player.angle += dx * options.mobileTurnSens;
},{passive:false});
```

## GITHUB PAGES URL

**Pages URL**: https://falloutmule.github.io/solidarity-not-charity-can-run/

**Cache-busted URL (this fix)**: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=863cc24

**Debug URL**: https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=863cc24

**GitHub issue**: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
