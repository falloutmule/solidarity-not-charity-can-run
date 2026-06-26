# CONTROL DOCK HEIGHT ONLY REPORT

## WHAT WAS DONE

- Backup: `index.before-control-dock-height-only.html`
- **BUILD_ID** → `dock1`
- **`portraitLayout()`** refactored:
  - **Removed** `controlsYOffsetPx` from `bandTop` / `minimapRect` / `statsRect` / `fpvRect` math
  - **Fixed** minimap at `y = fpvH`, stats at `y = ch - statsH`
  - **Applied** offset as `dockDy` only to control dock: `dockBot`, `moveRect`, `giveRect`, `lookRect`, `sprintRect`, `menuRect.top`
- Landscape mobile path unchanged (`applyMobileControlSettings` else branch still uses `yOff` on `#ml`, `#mg`, `#ms`, `#mlookpad` only)
- User-facing label: **CONTROL DOCK HEIGHT**
- Options helper text updated (see below)
- Added **`getControlDockRectProof()`** on `CR` for MID vs HIGH rect comparison
- **`proof-control-dock-rects.json`** committed

## WHAT WAS VERIFIED

| Check | Result |
|-------|--------|
| Backup | yes |
| `node --check` | pass |
| `onclick` / `eval` | none |
| Title | Solidarity Not Charity Can Run |
| `minimapRect.y` at offsets 0, -120, +120 | **826 / 826 / 826** |
| `statsRect.y` at same offsets | **558 / 558 / 558** |
| `menuRect.top` MID vs HIGH (-120) | **997 → 946** (dock moves) |
| DOM `ml.top` MID vs HIGH (browser) | **478 → 358** |
| Hall movement stop | `dpx: 0`, `canStand: true` |
| Git push | **`cd98ed3`** |

## WHAT FAILED

- Desktop browser is often **landscape** — portrait `mportmenu` DOM rect showed `0` while **layout** `menuRect` moved correctly. **Phone portrait** is the authoritative test.

## CURRENT EXACT STATE

- `options.controlsYOffsetPx` unchanged (save-compatible)
- Portrait: only **#ml #mg #ms #mlookpad #mportmenu** positions use `dockDy`
- Minimap **canvas** draw uses fixed `L.minimapRect` (no offset in band)

## REMAINING BLOCKERS

- Travis phone confirmation that minimap **visually** stays put while controls move

## NEXT ACTIONABLE STEP

Phone checklist on `?mobile=on&v=dock1` (below)

## EVIDENCE

### Removed offset from (old `portraitLayout` ~3801–3808)

- `bandTop = fpvH + yClamp` → **`bandTop = fpvH`**
- `minimapRect.y` no longer includes `yClamp`
- `controlsY0` / `statsY` no longer shift with control height
- `maxDown`/`maxUp` no longer use `fpvH + miniH` band shift

### Offset still applies (new ~3815–3843)

- `dockDy` from `controlsYOffsetPx` (clamped within control band)
- `dockBot = ctrlY0 + controlsH*0.66 + dockDy`
- `moveRect`, `giveRect`, `lookRect`, `sprintRect` derived from `dockBot`
- `menuRect.top = ctrlY0 + 6 + dockDy`

### Options text

- **Old:** `Tap row — whole control + map band moves (see through panel)`
- **New:** `Tap row — moves MOVE / GIVE / SPRINT / LOOK / MENU only`

### Future note (not implemented)

- Minimap vertical tuning should be a separate **MAP PANEL Y** / **MAP HEIGHT** option, not tied to control dock height.

### Proof files

- `proof-control-dock-rects.json`
- `proof-control-dock-mid.png` (local)
- `proof-control-dock-high.png` (local)

## GITHUB PAGES URL

- https://falloutmule.github.io/solidarity-not-charity-can-run/
- **Cache-busted:** https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=dock1

**Commit:** `cd98ed3`