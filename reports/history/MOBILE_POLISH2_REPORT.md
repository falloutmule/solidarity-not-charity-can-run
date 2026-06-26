# Canned Run — Mobile Polish 2 Report

## WHAT WAS DONE

- Created required backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-polish2.html`

- Minimap polish:
  - Reduced mobile minimap to a smaller 2px-per-cell render.
  - Current mobile map size is 84×84 for the 42×42 city.
  - Tucked it close to the top-right corner with about 10px right gap.
  - Moved MAP button closer to the top-right corner.

- Mobile SPRINT polish:
  - Moved SPRINT from the left side to the right-side control family.
  - Current mobile layout:
    - GIVE: right side, mid-right.
    - SPRINT: right side, below GIVE.
    - MAP: top-right.
    - PAUSE: top-left.
    - MOVE joystick: bottom-left.
  - Changed mobile SPRINT from hold-to-sprint to tap-burst:
    - Tap SPRINT once.
    - Burst lasts 1.0 second.
    - Touchend does not cancel the burst.
    - Button visual stays active during burst and clears after burst ends.
  - Desktop Shift sprint remains hold-to-sprint.

- LOOK hint polish:
  - Fixed hint reset/hide path.
  - Hint shows initially on a fresh run.
  - After LOOK drag or movement, it is hard-hidden with `display:none` so it cannot linger visually.

- Sprite/object halo cleanup:
  - Removed the remaining sprite fog overlay entirely.
  - Important correction: the previous per-column fog fix was still not enough, because `fillRect(col, top, 1, screenH)` still painted transparent pixels inside each sprite column.
  - Removed can pickup glow so phone scaling cannot reveal a faint square around pickups.
  - Removed exit floor glow pass because it was a separate non-z-tested glow layer.
  - Kept sprite drawing z-tested against wall depth.
  - Result: clean sprites prioritized over decorative haze/glow.

- Updated the reusable `self-contained-html-games` skill:
  - Corrected the sprite-fog halo pitfall.
  - Updated the failure-mode catalog so future raycaster work does not repeat the per-column full-height fog mistake.

## WHAT WAS VERIFIED

Static checks:

- Backup exists: yes.
- JavaScript syntax check with `node --check`: pass.
- Inline `onclick`: 0.
- `eval`: false.
- External libraries/assets/backend URLs: none.
- Sprite fog full-height `fillRect(col, top...)`: removed.
- Exit floor glow marker: removed.
- Can glow RGBA marker: removed.

Desktop smoke:

- Game loads: pass.
- Runtime errors: 0.
- New run starts: pass.
- Keyboard movement works: pass.
- Desktop Shift sprint still consumes stamina as hold sprint: pass.
- Pickup path works: pass.
- Handoff path works after correct `updateAim()` setup: pass.
- Pause/resume via keyboard path: pass.

Forced mobile smoke:

- Full-width canvas still matches viewport: pass.
- SPRINT is on right side: pass.
- MAP button is near top-right: pass.
- Minimap is 84×84 and tucked into top-right with ~10px right gap: pass.
- LOOK hint initially visible: pass.
- LOOK drag turns camera: pass.
- LOOK hint hidden after look interaction: pass (`display:none`).
- Mobile SPRINT tap starts burst: pass.
- SPRINT burst ends automatically after ~1 second: pass.
- MOVE joystick still moves player: pass.
- No runtime errors during forced mobile smoke: pass.

Visual verification:

- Captured proof screenshot:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-polish2.png`
- Screenshot shows:
  - Gameplay fills full width.
  - Minimap small/tucked top-right.
  - SPRINT on right side below GIVE.
  - Can/NPC/props visible.
  - No rectangular halos/faint boxes detected around can, NPC, crate/cart/pole props in local proof screenshot.

## WHAT FAILED

- Real-phone final visual result is still pending until Travis retests on Android Chrome.
- Earlier halo fix claim was too optimistic; local automation did not catch that full-height per-column fog still paints transparent pixels. This pass removed the suspect fog/glow paths entirely.
- Browser automation reported computed opacity oddly for the LOOK hint even after class/inline opacity, so the final fix uses `display:none` after interaction instead of relying on opacity alone.

## CURRENT EXACT STATE

Updated file:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

Backup:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-polish2.html`

Report:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_POLISH2_REPORT.md`

Proof:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-polish2.png`

Behavior now:

- Fullscreen/full-width behavior remains intact locally.
- Minimap is smaller and closer to top-right.
- SPRINT is on right side on mobile.
- Mobile SPRINT is a 1-second tap burst.
- Desktop Shift sprint remains hold-to-sprint.
- LOOK hint hard-hides after interaction.
- Main rectangular sprite halo sources have been removed.

## REMAINING BLOCKERS

- Real-phone retest is required to confirm final visual result.
- If any halos remain on phone, the next likely source is sprite texture content itself or mobile scaling of individual transparent edge pixels, not the removed fog/glow overlay paths.

## NEXT ACTIONABLE STEP

Retest on Android Chrome from the delivered Telegram file:

1. Open updated file from Telegram/Downloads.
2. Tap FULLSCREEN.
3. Start a run.
4. Confirm minimap is smaller and tucked farther into top-right.
5. Confirm SPRINT is on the right side.
6. Tap SPRINT once and confirm it gives a short burst without holding.
7. Confirm MOVE / LOOK / GIVE / MAP / PAUSE still work.
8. Look closely at cans, people, crates/props, poles, and anything glowing.
9. Confirm whether faint boxes/halos are gone.

## EVIDENCE

- Static syntax/check output:
  - `node_exit 0`
  - `backup True`
  - `onclick 0`
  - `eval False`
  - `externals []`
  - `sprite_fog_fillRect False`

- Desktop smoke result:
  - `newRun true`
  - `moved true`
  - `desktopShiftConsumes true`
  - `pickup true`
  - `handoff true`
  - `pauseOn true`
  - `pauseOff true`
  - `errors []`

- Forced mobile result:
  - `fullWidth true`
  - `sprintRight true`
  - `mapNearTopRight true`
  - `minimap W=84 H=84 rightGap=10`
  - `initialHint block`
  - `afterHint none`
  - `lookTurns true`
  - `joyMoves true`
  - `burstStarted true`
  - `burstEnded true`
  - `errors []`

- Visual proof screenshot analysis:
  - Minimap small/top-right: confirmed.
  - SPRINT on right: confirmed.
  - Full-width gameplay: confirmed.
  - Can/NPC/props visible: confirmed.
  - Rectangular sprite halos/faint boxes: not visible in local proof screenshot.

## TELEGRAM DELIVERY

- Deliver updated `index.html` as Telegram attachment.
- Deliver this report as Telegram attachment.
- Deliver proof screenshot as Telegram attachment.
- Real-phone final result remains pending until Travis retests.
