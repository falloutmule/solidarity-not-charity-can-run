# MOBILE PASS REPORT — Canned Run

## WHAT WAS DONE

- Created the required pre-mobile backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile.html`

- Implemented mobile browser support in the one-file game:
  - Mobile viewport meta with `viewport-fit=cover`
  - `touch-action:none` on body, canvas, controls, and mobile menu surfaces
  - Passive-disabled touch handlers for gameplay controls
  - Mobile overlay `#mob`
  - Left joystick zone
  - Right turn/look zone
  - GIVE button
  - SPRINT button
  - MAP button
  - PAUSE button
  - Responsive mobile menu `#rmenu`
  - Portrait hint `#porthint`
  - `options.mobileControls`: `auto`, `on`, `off`
  - DPR-aware canvas resize
  - `orientationchange` and `visualViewport` resize handling

- Fixed a real mobile menu bug reported from phone testing:
  - Symptom: menu was visible on mobile, but taps did not start a run or activate menu buttons.
  - Reproduced with a synthetic mobile touch path: `touchstart` on NEW RUN, menu redraw, `touchend` on menu surface.
  - Root cause: `drawMobileMenu()` rebuilt `#rmenu.innerHTML` every animation frame. On real touchscreens, the tapped `.rit` button could be destroyed between `touchstart` and `touchend`, so the `touchend` handler no longer found the tapped item and no action ran.
  - Secondary cause: some mobile menu buttons used inline `onclick` instead of `data-action`; the touch handler used `preventDefault()`, so native click fallback was suppressed.
  - Fix: store the selected menu action on `touchstart`, then execute that stored action on `touchend` even if the DOM was rebuilt. The stored action supports both `data-action` and inline `onclick` attributes.
  - Fix: added `touchcancel` cleanup.
  - Fix: changed `rmenuHTML()` to avoid replacing `innerHTML` when the HTML is unchanged, reducing per-frame menu churn and helping seeded-run input focus.

- Updated proof screenshot:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile.png`
  - This is a forced-mobile-menu screenshot captured on desktop, not a real phone screenshot.

- Updated this report:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_REPORT.md`

## WHAT WAS VERIFIED

### Desktop verified

- Local server starts from:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run`
- Server URL:
  - `http://127.0.0.1:8787/index.html`
- Game loads from the local server.
- `startRun` exists and is callable.
- `drawMobileMenu` exists and is callable.
- Desktop canvas renders the title screen.
- Desktop auto-detection reports `mobileMode=false`.
- `setMobileMode(true)` forces the mobile overlay on.
- `setMobileMode(false)` hides the mobile overlay.
- Desktop run lifecycle still works via scripted smoke test:
  - `startRun(...)` enters `state='play'`
  - `endRun()` enters `state='results'`
- Local stats persist in `cannedRun.stats.v1`.
- Local leaderboard persists in `cannedRun.leaderboards.v1`.

### Mobile touch-path verified by emulated/synthetic touch events

- Forced mobile/small-screen state:
  - `innerWidth=390`
  - `innerHeight=844`
  - `setMobileMode(true)`
- Mobile title menu becomes visible.
- Synthetic touch sequence reproduced the phone bug before the fix:
  - `touchstart` on NEW RUN
  - `drawMobileMenu()` redraw between start/end
  - `touchend` on `#rmenu`
  - Before fix: state stayed `title`
- Same sequence after fix:
  - state changes to `play`
  - a run starts successfully
- SEEDED RUN menu touch path verified after fix:
  - tap SEEDED RUN changes state to `seeded`
  - seeded input appears
  - tap START THIS SEED starts a run with seed `55555`
- Mobile menu proof screenshot captured after hiding portrait hint:
  - central mobile menu visible
  - NEW RUN / SEEDED RUN / CONTINUE / STATS / LEADERBOARDS / OPTIONS visible
  - tap instruction visible

### Real phone verified

- User verified the initial real-phone bug:
  - file loaded on mobile
  - menu was visible
  - menu taps did not activate anything
- The post-fix version has not yet been re-tested by the user on the real phone.
- Real-phone joystick movement, right-side turn, GIVE, SPRINT, MAP, PAUSE, and mobile save/continue still need post-fix confirmation.

### Inferred but not fully tested on real phone

- `touch-action:none` should prevent page scroll during gameplay.
- `passive:false` touch handlers should allow `preventDefault()` on Android Chrome.
- Joystick release cleanup should prevent stuck movement after finger lift.
- DPR and visual viewport hooks should handle rotation/address-bar changes.
- Seeded-run input should be more stable after `rmenuHTML()` stopped rebuilding unchanged HTML every frame.

## WHAT FAILED

- Real phone test found a blocker:
  - mobile menu taps did not activate menu buttons.
- Root cause was confirmed and fixed in `index.html`.
- The fixed build still needs user confirmation on the same phone.

- `proof-mobile.png` is still not a real-phone screenshot.
  - It is a forced-mobile-menu screenshot captured in the desktop browser automation environment.

- No physical-device post-fix verification has been completed yet.

## CURRENT EXACT STATE

- Main file:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
  - 2291 lines
  - 102,689 bytes

- Backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile.html`

- Proof screenshot:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile.png`
  - 30,455 bytes
  - forced-mobile-menu screenshot, not real phone

- Report:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_REPORT.md`

- Server:
  - running from the project folder on port `8787`
  - likely phone URL on LAN:
    - `http://192.168.0.5:8787/`

- Current mobile menu fix status:
  - synthetic mobile tap test passes
  - real phone re-test pending

## REMAINING BLOCKERS

- Need the user to reload the updated file on the phone and verify the menu now responds.
- Need real-phone verification for:
  - NEW RUN tap
  - SEEDED RUN tap/input
  - OPTIONS tap
  - portrait hint PLAY ANYWAY tap
  - landscape overlay visibility
  - joystick movement
  - right-side camera turning
  - GIVE button
  - SPRINT button
  - MAP button
  - PAUSE button
  - pause/resume menu buttons
  - save/continue after reload
  - stats/leaderboard after reload
- Need a real-phone screenshot to replace the forced-desktop proof if strict evidence is required.

## NEXT ACTIONABLE STEP

On the phone:

1. Hard-refresh/reload the page:
   - `http://192.168.0.5:8787/`
2. If Chrome cached the old file, add a cache-busting query:
   - `http://192.168.0.5:8787/index.html?fix=mobile-menu-tap`
3. Tap NEW RUN.
4. Confirm whether the run starts.
5. If it starts, rotate to landscape and test controls:
   - left joystick moves
   - right side drag turns
   - GIVE works
   - SPRINT works
   - MAP toggles
   - PAUSE opens menu
6. If it still does not start, report whether the button visibly highlights/presses when touched.

## EVIDENCE

- Reproduction before fix:
  - forced mobile state at 390×844
  - NEW RUN `touchstart`
  - menu redraw
  - `touchend` on `#rmenu`
  - result: `stateAfter='title'`

- Verification after fix:
  - same sequence
  - result: `stateAfter='play'`

- SEEDED RUN verification after fix:
  - tap SEEDED RUN
  - result: `stateAfter='seeded'`
  - seeded input appears
  - tap START THIS SEED with `55555`
  - result: `stateAfter='play'`, `seed=55555`

- Updated files:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile.png`
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_REPORT.md`
