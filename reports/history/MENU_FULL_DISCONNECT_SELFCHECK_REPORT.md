# MENU full disconnect + self-check (menufix1)

## WHAT WAS DONE
- Backup: `index.before-menu-full-disconnect-selfcheck.html`
- `BUILD_ID` → `menufix1`
- `syncPortraitMenuLabel()` — MENU shows `MENU` + build id only (no `dock:` / `controlHeightMenuLabel`)
- `drawPortraitDashboardChrome()` — canvas hint is `build menufix1` only (no dock label)
- `touchdebug` — `#mportmenu` rect, display, pointer-events, text
- `layoutdebug` — outlines `#mportmenu`
- `CR.runControlDockSelfCheck()` — automated MID/LOW/HIGH/VERY HIGH rect + text assertions
- Playwright proof: `proof-control-dock-selfcheck.json` + 3 screenshots

## WHAT WAS VERIFIED
- **Self-check:** `CR.runControlDockSelfCheck().pass === true` (390×844 portrait, `?portraitlayout=1`)
- **MENU text:** stable innerHTML across all dock offsets (`menufix1` only)
- **MENU Y:** 463 at mid/high/very-high (DOM); layout `menuRect.top` unchanged
- **Controls move:** mid→high ΔY = 120px for MOVE/GIVE/SPRINT/LOOK (threshold 20px, preferred 40px)
- **Fixed:** minimap/stats/FPV layout Y + canvas rect stable
- **OPTIONS helper:** unchanged correct text — moves MOVE/GIVE/SPRINT/LOOK only
- **Static:** backup exists; `menufix1` in source; no `dock:` in `syncPortraitMenuLabel`; `runControlDockSelfCheck` present
- **Screenshots:** `proof-selfcheck-mid.png`, `proof-selfcheck-high.png`, `proof-selfcheck-very-high.png`

## WHAT FAILED
- Nothing blocking push (Playwright chromium install was required once on this machine)

## CURRENT EXACT STATE
- `index.html` — MENU fully disconnected from CONTROL DOCK HEIGHT (position + label + debug)
- Portrait dock offset applies only to move/give/sprint/look rects (unchanged from prior lock)

## REMAINING BLOCKERS
- Real S21 visual confirmation not run here (automated self-check is the gate before asking Travis)

## NEXT ACTIONABLE STEP
- Travis: open cache-busted URL, cycle CONTROL DOCK HEIGHT, confirm visually matches self-check
- Then Kanban **Card 2** (sprite halo regression guard) only

## EVIDENCE
- Old MENU label: `MENU` + `BUILD_ID` + `<br>dock: MID (+0px)` (via `controlHeightMenuLabel`)
- New MENU label: `MENU` + `menufix1` only
- Old OPTIONS helper: already `Tap row — moves MOVE / GIVE / SPRINT / LOOK only`
- New OPTIONS helper: same
- Proof JSON: `proof-control-dock-selfcheck.json`
- Screenshots: `proof-selfcheck-mid.png`, `proof-selfcheck-high.png`, `proof-selfcheck-very-high.png`
- MENU DOM top: 463 (all settings); MOVE top mid 557 → high 437 (Δ120)

## GITHUB PAGES URL
- https://falloutmule.github.io/solidarity-not-charity-can-run/?v=040aea6&mobile=on&portraitlayout=1
- Commit: `040aea6`