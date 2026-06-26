# LVL2 INPUT + OPTIONS FIX REPORT

## WHAT WAS DONE

- Backup: `index.before-lvl2-input-options-fix.html`
- **BUILD_ID** → `lvl2`
- **cycleStepValue** — zero-safe (`Number.isFinite` instead of `|| steps[0]`)
- **clearMoveInput()** — clears `inp.fwd/back/left/right/turnLeft/turnRight`
- **endJoy()** — calls `clearMoveInput()` after resetting joy
- **clearInputState()** — uses `clearMoveInput()`
- **update()** — `else clearMoveInput()` when `!joy.active`
- **OPTIONS** — single scroll column: removed inner `max-height:58vh` nest; `.options-scroll-body` + `.rpan.options-tune` with `overflow-y:auto`, `touch-action:pan-y`, bottom safe padding
- **UI/control layout** — unchanged (no placement/overlap edits)

## WHAT WAS VERIFIED

| Area | Result |
|------|--------|
| Backup exists | yes |
| `node --check` syntax | pass |
| inline `onclick` | none |
| `eval(` | none |
| Title | Solidarity Not Charity Can Run |
| cycleStepValue tests | 120→0, 0→-120, -120→-240, -240→120 **OK** |
| CONTROL HEIGHT tap from 0 | row **HIGH (-120px)**, `options.controlsYOffsetPx=-120` |
| Normal run joy release | `dpx:0`, `inp.fwd:false` after clear |
| Hall joy release | position stable, `dpx:0`, `fwd:false` |
| OPTIONS scroll | `rmenu` scrollHeight > viewport; BACK visible at bottom |
| Commit/push | `1e4b716` |

## WHAT FAILED

- **Real-phone** Travis verification not done in this pass (desktop/browser only)

## CURRENT EXACT STATE

- `index.html` only, **BUILD_ID=lvl2**
- Hall spawn/collision from **lvl1** preserved
- Control height cycles through **LOW (+120) → MID (0) → HIGH (-120) → VERY HIGH (-240)**

## REMAINING BLOCKERS

- Phone confirmation on cache-busted URL

## NEXT ACTIONABLE STEP

Travis phone checklist (below) on `?mobile=on&v=lvl2`

## EVIDENCE

### cycleStepValue fix

```javascript
const raw = Number(current);
const safe = Number.isFinite(raw) ? raw : steps[0];
const n = nearestStep(safe, steps);
return cycleValue(n, steps);
```

### endJoy / clearMoveInput

- `endJoy()` resets joy + `clearMoveInput()` + `updateJoyDot(0,0)`
- Per-frame: `if(joy.active) syncInpFromJoy(); else clearMoveInput();`

### OPTIONS scrolling

- Removed nested `58vh` scroll div
- All rows + FULLSCREEN + BACK in `.options-scroll-body`
- Panel: `touch-action:pan-y`, `padding-bottom: max(120px, safe-area)`

### Movement stop (simulated)

- Normal: moved ~1.06 tiles, then **dpx=0** after release
- Hall: **h2 === h1** after release, **dpx=0**

### Proof screenshots (local)

- `proof-control-height-after-tap.png`
- `proof-options-scroll-bottom.png`
- `proof-hall-stop-debug.png`

## GITHUB PAGES URL

- https://falloutmule.github.io/solidarity-not-charity-can-run/
- **Cache-busted:** https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=lvl2

**Commit:** `1e4b716`