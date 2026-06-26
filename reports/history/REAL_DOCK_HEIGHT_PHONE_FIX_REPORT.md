# REAL DOCK HEIGHT PHONE FIX REPORT

## WHAT WAS DONE

- Backup: `index.before-real-dock-height-phone-fix.html`
- **BUILD_ID** → `dock2`
- **`portraitLayout(overrideYOffset)`** rework:
  - Removed **maxUp / maxDown / minMoveTop / maxDockBot** clamping that collapsed `dockDy` (often to **-51** instead of **-120**)
  - Baseline MOVE/GIVE/SPRINT/LOOK/MENU positions computed at **MID (0)**
  - Full **`controlsYOffsetPx`** applied via **`portraitShiftY()`** to all five control rects only
  - **minimapRect / statsRect / fpvRect** unchanged by offset
- **Debug**
  - MENU sublabel: `dock2` + `dock: HIGH (-120px)` etc.
  - Canvas label under MENU in portrait chrome
  - **`CR.getControlDockRectProof()`** — layout at **+120 / 0 / -120 / -240** without mutating saved option
- Optional QA flag: **`?portraitlayout=1`** forces portrait layout math when testing on desktop (swap cw/ch when needed)

## WHAT WAS VERIFIED

| Check | Result |
|-------|--------|
| Backup | yes |
| `node --check` | pass |
| `onclick` / `eval` | none |
| Title | Solidarity Not Charity Can Run |
| **minimapRect.top** at +120, 0, -120, -240 | **826, 826, 826, 826** |
| **statsRect.top** | **558** all four |
| **fpvRect.top** | **0** all four |
| **moveRect.top** | **1042 / 922 / 802 / 682** |
| **mid→HIGH move Δ** | **120px** |
| **LOW→VERY HIGH move Δ** | **360px** |
| Hall stop-on-release | `dpx: 0`, spawn OK |
| Local proof PNGs | `proof-dock-low/mid/very-high.png` |
| `proof-dock-rects.json` | committed locally |

## WHAT FAILED

- **Git push** blocked this session (consent timeout) — commit may be local only; run push manually.
- Desktop browser tool strips some query params; **`portraitlayout=1`** needs full URL on device.
- Landscape desktop screenshots show partial DOM movement; **authoritative portrait proof is layout math + your phone**.

## CURRENT EXACT STATE

- Saved option key unchanged: `controlsYOffsetPx`
- Portrait: **+120** lowers controls (larger `top`), **-240** raises (smaller `top`)
- No change to control sizes or overlap geometry

## REMAINING BLOCKERS

- Travis **phone portrait** screenshots to confirm visual match

## NEXT ACTIONABLE STEP

1. `git add index.html proof-dock-rects.json` && `git commit` && `git push` if not pushed  
2. Phone test on cache-busted URL below

## EVIDENCE

### Root cause (mini1 / dock1)

```text
dockDy = clamp(yOff, -maxUp, maxDown)  // often shrank -120 → -51
dockBot clamped by minMoveTop + maxDockBot  // moveRect.top stuck ~442
```

### mini1 vs dock2 (example viewport cw=1258 ch=622)

| Offset | mini1 moveTop (broken) | dock2 moveTop |
|--------|------------------------|---------------|
| +120 | ~442 (clamped) | **1042** |
| 0 | 442 | **922** |
| -120 | 442 | **802** |
| -240 | ~442 | **682** |

### portraitLayout changes

- Added `portraitShiftY(rect, dy)`
- `dy = controlsYOffsetPx` (no dock band shift)
- Removed dockBot clamp chain

### Proof files

- `proof-dock-rects.json`
- `proof-dock-low.png` (+120)
- `proof-dock-mid.png` (0)
- `proof-dock-very-high.png` (-240)

## GITHUB PAGES URL

- https://falloutmule.github.io/solidarity-not-charity-can-run/
- **Cache-busted:** https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=dock2

**Commit:** `ff35f42` (push to origin when ready)