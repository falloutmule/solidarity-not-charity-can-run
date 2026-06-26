# Canned Run — Mobile Clarity Report

## WHAT WAS DONE

- Created backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-clarity.html`

- Polished mobile layout and control discoverability in:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

- Right-side LOOK / turn zone is now visually intentional:
  - translucent gradient panel on `#mr`
  - left border accent
  - `LOOK` + `DRAG TO TURN` hint (`#mlookhint`)
  - subtle left/right arrows
  - hint fades to subtle opacity after first right-side drag
  - hint hidden outside active mobile gameplay

- Control labels clarified:
  - joystick: `MOVE`
  - buttons: `GIVE`, `SPRINT`, `MAP`, `PAUSE`

- Fixed menu text appearing over gameplay:
  - added `rmenuClearForGameplay()` to clear `#rmenu` HTML, clear pending tap action, and hide panel
  - during `STATE.PLAY` and not paused, `drawMobileMenu()` now clears/hides `#rmenu` every frame
  - prevents stale title items (`SEEDED RUN`, `STATS`, `LEADERBOARDS`, `OPTIONS / HELP`) from lingering over the world

- Mobile landscape layout polish:
  - added `playfieldLayout()` so mobile landscape uses cover scaling instead of heavy side letterboxing
  - controls remain fixed overlays; canvas fills more of the screen under them

- Optional mobile turn sensitivity:
  - added `options.mobileTurnSens` (default `0.0045`)
  - persisted in settings save/load
  - used by right-side drag turning only; desktop mouse/QE unchanged

- Reset path updated to restore `mobileTurnSens`.

- Captured proof screenshot:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-clarity.png`

## WHAT WAS VERIFIED

### Static checks

- Backup exists.
- Node syntax check: PASS (`node --check` exit 0)
- Final file size: 2541 lines
- Inline `onclick=` handlers: 0
- `eval()`: 0
- No external libraries/assets added

### Desktop smoke test

Loaded from local server and verified:

- new run starts
- movement works
- pickup works
- handoff works
- pause/resume works
- results transition works
- runtime errors: 0

### Forced / synthetic mobile test

Verified with forced mobile mode and landscape dimensions:

- mobile overlay shows
- during `STATE.PLAY`, `#rmenu` is hidden and empty
- right-side drag changes camera angle
- joystick movement changes player position
- `GIVE`, `SPRINT`, `MAP`, `PAUSE` work
- `MOVE` label present
- `LOOK / DRAG TO TURN` hint visible before first drag
- hint becomes subtle after first drag
- runtime errors: 0

### Real-phone status

- Prior user testing confirmed:
  - game opens on Android Chrome
  - joystick works
  - right-side drag turns camera
  - gameplay is playable
- **Retest on Android Chrome is still pending** for this updated clarity build.

## WHAT FAILED

- Nothing blocking in local verification.
- Initial proof screenshot captured portrait-hint overlay first; dismissed hint and recaptured gameplay proof successfully.
- Real-phone retest not performed in this pass (honestly pending).

## CURRENT EXACT STATE

- Updated game:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
  - 2541 lines

- Backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-clarity.html`

- Report:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_CLARITY_REPORT.md`

- Proof:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-clarity.png`

## REMAINING BLOCKERS

- Real-phone verification of this updated build is still pending.

## NEXT ACTIONABLE STEP — REAL-PHONE RETEST

Please verify on Android Chrome:

1. Open the updated `index.html` from Telegram.
2. Tap **NEW RUN**.
3. Rotate to landscape.
4. Confirm title/menu text is **gone** during gameplay.
5. Move with the left joystick (`MOVE`).
6. Drag the right-side **LOOK / DRAG TO TURN** zone.
7. Confirm the camera turns.
8. Confirm the right side looks intentional, not dead black space.
9. Test **GIVE**, **SPRINT**, **MAP**, **PAUSE**.

## EVIDENCE

- Static syntax pass.
- Desktop smoke pass with zero runtime errors.
- Forced mobile pass with:
  - `rmenuEmpty: true`
  - `rmenuHidden: true`
  - `turnZone: true`
  - `hintSubtleAfterDrag: true`
- Proof screenshot saved.

## TELEGRAM DELIVERY

- Updated game file attached with this message as:
  - `MEDIA:C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

- Report attached as:
  - `MEDIA:C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_CLARITY_REPORT.md`

- Proof attached as:
  - `MEDIA:C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-clarity.png`