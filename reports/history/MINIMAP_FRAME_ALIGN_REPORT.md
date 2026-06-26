# MINIMAP FRAME ALIGN REPORT

## WHAT WAS DONE

- Backup: `index.before-minimap-frame-align.html`
- **BUILD_ID** → `mini1`
- **Portrait panel** (`portraitLayout`):
  - Width **91%** of screen, **centered** (was full width)
  - Height **max(128, ch×0.238)** (was max(150, ch×0.265))
- **`computePortraitMinimapDraw(mr)`**:
  - `scale = min(maxW/MAP_W, maxH/MAP_H) × szScale`
  - `szScale` from `options.minimapSizePx` (68 baseline, clamp 0.78–1.15)
  - Centers draw rect in panel
- **`drawMinap()`** portrait path:
  - Blue/gold **border on map draw rect**, not full-width panel
  - Clip to actual map pixels
- **`getMinimapAlignProof()`** on `CR`
- **CONTROL DOCK HEIGHT** / dock layout **unchanged**

## WHAT WAS VERIFIED

| Check | Result |
|-------|--------|
| Backup | yes |
| `node --check` | pass |
| `onclick` / `eval` | none |
| Title | Solidarity Not Charity Can Run |
| Normal MAP | **40×20**, draw aspect **2.0** |
| Hall MAP | **30×14**, draw aspect **2.143** |
| Dock regression | `minimapY` **826** MID & HIGH; `ml.top` **478→358** |
| Git push | see commit below |

## WHAT FAILED

- Desktop browser tests run in **landscape** — portrait minimap band not visible in local PNGs; **layout math + `getMinimapAlignProof()`** are authoritative until phone check.

## CURRENT EXACT STATE

- Minimap panel fixed in Y (below FPV); size smaller than dock1
- Map draw respects **MAP_W / MAP_H**; no width-only stretch
- `options.minimapSizePx` still scales portrait draw via `szScale`

## REMAINING BLOCKERS

- Travis visual confirm on real phone portrait

## NEXT ACTIONABLE STEP

Phone checklist on `?mobile=on&v=mini1`

## EVIDENCE

### Prior build

- **dock1** / commit **cd98ed3**

### Old portrait minimap (dock1)

- Panel: `x=0`, `w=cw` (100%), `h=max(150, ch×0.265)`
- Draw: `cell = (panelW−12)/MAP_W` (width-driven only)
- Border: full panel `mr.w × mr.h`

### New portrait minimap (mini1) — example at cw≈1258

- Panel: `x=57`, `w=1145` (~91%), `h=148`, `y=826`
- Normal draw: `W=256`, `H=128`, centered `ox=502`
- Hall draw: `W≈274`, `H=128`, aspect **2.143**

### CONTROL DOCK HEIGHT regression

- `minimapY`: **826 / 826** (MID vs HIGH)
- Controls: `ml.top` **478 → 358**

### Debug

- `CR.getMinimapAlignProof()`
- `CR.getControlDockRectProof()`

### Proof files (local)

- `proof-minimap-align-normal.png`
- `proof-minimap-align-hall.png`
- `proof-minimap-fixed-vs-dock-high.png`

## GITHUB PAGES URL

- https://falloutmule.github.io/solidarity-not-charity-can-run/
- **Cache-busted:** https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=mini1

**Commit:** `e422f05`