# Handoff: CONTROL HEIGHT — label/number does not change (mobile)

**Date:** 2026-06-25  
**Build:** `ctrlh6` (latest pushed); user report may reference `ctrlh5` screenshot (~5:18, 94% battery)  
**Repo:** `C:/Users/fallo/Documents/HermesProjects/canned-run/index.html`  
**Live:** `https://falloutmule.github.io/solidarity-not-charity-can-run/`

---

## Reported symptom

On Android Chrome, portrait, **MOBILE ON** (user confirmed mobile toggle works):

- In **OPTIONS / HELP**, user taps gold **CONTROL HEIGHT** row.
- **The displayed label/number does not change** (e.g. stays `MID (0px)`).
- User did **not** confirm beep, toast, band movement, or MENU build id in the handoff message.

Earlier related issues (partially addressed):

- Double menu (canvas `OPTIONS & HELP` + HTML OPTIONS) — fixed in **ctrlh6**.
- Height adjuster “does nothing” — multiple fixes in **ctrlh4–ctrlh6**; user still reports **number doesn’t change**.

---

## Preconditions (must all be true)

| Requirement | If false |
|-------------|----------|
| `mobileMode === true` (`MOBILE: ON` or `AUTO` on coarse phone) | Desktop canvas path; CONTROL HEIGHT irrelevant |
| `isMobilePortrait() === true` | Landscape branch; weak/no zone shift |
| `BUILD_ID` on OPTIONS = `ctrlh6` (or newer) | Stale cache / old deploy |
| Tap hits HTML row `data-action="option-ctrlheight"` | Wrong layer or no handler |

**Evidence user was on mobile path:** OPTIONS screenshot with `build ctrlh5`, HTML CONTROL HEIGHT row, tune-preview copy (post–ctrlh5).

---

## Expected behavior (ctrlh5+)

1. Tap **CONTROL HEIGHT** (OPTIONS only; removed from PAUSE in ctrlh5).
2. `bumpControlHeight()` → `cycleStepValue` on `CONTROL_Y_STEPS` `[120, 0, -120, -240]`.
3. `options.save()` → `applyMobileControlSettings()` → `portraitLayout()` places DOM sticks.
4. `_optionsMenuStamp++` → `drawMobileMenu()` rebuilds HTML with new `controlHeightMenuLabel(px)`.
5. Beep + `showToast` + `setMsg` with new label (ctrlh5+).

**Label format:** `LOW (+120px)` | `MID (0px)` | `HIGH (-120px)` | `VERY HIGH (-240px)` (thresholds at 60 / 0 / -180).

---

## Code paths (single source of truth)

- **Cycle:** `bumpControlHeight()` (~line 485)
- **Steps:** `CONTROL_Y_STEPS`, `controlHeightMenuLabel()`
- **Persist:** `options.controlsYOffsetPx` in `ls` key `cncr_options_v1`
- **Layout:** `portraitLayout()` — `bandTop = fpvH + yClamp`; minimap + controls move; stats pinned `ch - statsH`
- **HTML menu:** `drawMobileMenu()` OPTIONS block; stamp `data-om-stamp="${_optionsMenuStamp}"`
- **Tap:** `rmenuAction('option-ctrlheight')` → `bumpControlHeight()`
- **Listeners:** `rmenuHTML()` — `touchstart` + `click` on `#rmenu`, dedupe 280ms, `preventDefault` on touch

**Canvas duplicate (fixed ctrlh6):** `drawOverlays()` OPTIONS skipped when `mobileMode` — avoids second CONTROL HEIGHT row and ghost text.

---

## Failure modes (ranked for “number doesn’t change”)

### A. UI not rebound (most likely if tap fires)

- `rmenuHTML()` returns early: `r.innerHTML === html` **before** stamp was added — mitigated by hidden `_optionsMenuStamp` / `data-om-stamp`.
- **If stamp missing or not incremented:** row text frozen while `options.controlsYOffsetPx` may still change in storage.
- **Verify:** After tap, `localStorage` / `options.controlsYOffsetPx` in console vs visible row.

### B. Handler not invoked

- Touch swallowed by scroll container, duplicate handlers, or `pointer-events` on `#mob` during OPTIONS (`mob` has `pointer-events: none` during OPTIONS — correct for sticks, menu is `#rmenu`).
- Wrong target: canvas menu (desktop) — user on MOBILE OFF.
- **Verify:** Does beep/toast fire? If no → handler not running.

### C. Value not updating

- `cycleStepValue` / `indexOf` on float vs int mismatch (unlikely if steps are integers).
- `options.save()` failure (rare).

### D. User perceives “no change” while label updates

- Row off-screen / obscured; only one row visible after ctrlh6 dedupe.
- Label changes but band not visible (opaque panel) — ctrlh5 added `options-tune` transparency; ctrlh6 raised opacity to 0.72.

### E. Stale deploy / cache

- GitHub Pages or browser serving old `index.html` without stamp or `bumpControlHeight` toast.

---

## Fixes already shipped (timeline)

| Build | Change |
|-------|--------|
| ctrlh3 | MENU build id; pause preview |
| ctrlh4 | Stack math, touch dedupe, CONTROL_Y_STEPS, `controlsYOffsetApplied` |
| ctrlh5 | Whole-band shift, options-tune panel, pause row removed, toast, placeRect no vv offset |
| ctrlh6 | No canvas menu double-draw on `mobileMode` |

**User still reports:** number doesn’t change (after ctrlh5-era UX).

---

## Open / separate track

- **Desktop site checkbox (Chrome):** OFF = larger letterbox FPV; ON = smaller — explained as `mobileMode` + `playfieldLayout()` portrait cap vs fit; not CONTROL HEIGHT specific.
- **Pause CONTROL HEIGHT:** removed per user request; only OPTIONS.

---

## Device verification checklist

1. URL: `?mobile=on&v=ctrlh6` + hard refresh.
2. OPTIONS → `build ctrlh6` (not ctrlh3/4/5 only).
3. **MOBILE:** ON or AUTO (not OFF).
4. Tap CONTROL HEIGHT once:
   - Row text: changes Y/N?
   - Beep: Y/N?
   - Toast: Y/N?
   - Sticks/map band: moves Y/N?
5. If beep+toast but row static → **UI rebind bug** (`rmenuHTML` / stamp).
6. If nothing → **handler / cache / MOBILE OFF**.

---

## Suggested next engineering steps

1. **Force row update without innerHTML equality:** always set CONTROL HEIGHT row via `querySelector('[data-action=option-ctrlheight]')` text in `bumpControlHeight()` after cycle (bypass full menu rebuild).
2. **Log on device:** `?layoutdebug=1` or temporary toast showing `px=` + `stamp=` + `indexOf` result.
3. **Confirm `rmenuHTML` early-return:** log when skip happens vs stamp change.
4. **Remote debug:** Eruda or `console.log` in `bumpControlHeight` shipped one build.
5. **Regression:** ensure `option-ctrlheight` not duplicated in HTML after ctrlh6.

---

## Key files

- `index.html` — all logic single-file
- Skill: `~/AppData/Local/hermes/skills/creative/self-contained-html-games/references/portrait-control-height-and-rect-levels.md`

---

## User prefs (Telegram)

- No Markdown tables in chat summaries; bullets only.
- MOBILE toggle confirmed working; portrait UI expected when ON.