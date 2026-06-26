# Canned Run — Portrait Layout + Control Tuning Report

## WHAT WAS DONE

- Created required backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-portrait-tuning.html`

- Removed the fullscreen/landscape recommendation gate:
  - The old `#porthint` overlay is no longer shown when mobile mode starts.
  - NEW RUN is no longer blocked by any fullscreen recommendation screen.
  - Fullscreen support remains available through existing FULLSCREEN actions in title/options/pause flows.
  - In portrait gameplay, the small in-game fullscreen chip is hidden to avoid HUD overlap; fullscreen remains optional and accessible from menus/pause.

- Added portrait-specific gameplay layout:
  - Portrait is detected with `isMobilePortrait()`.
  - Portrait playfield now cover-scales over the full phone height so controls sit over gameplay instead of an opaque black dead zone.
  - HUD moves below the top PAUSE/MAP buttons in portrait to avoid overlap.
  - MOVE joystick is bottom-left.
  - LOOK zone occupies the right/lower-right gameplay side.
  - GIVE and SPRINT are stacked on the right side.
  - PAUSE is top-left.
  - MAP is top-right.
  - Mobile controls still hide on menus and show during gameplay.

- Added stronger numeric/stepped mobile control tuning:
  - LOOK SPEED cycles through:
    - `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`, `2.5x`, `3.0x`, `4.0x`
  - `1.0x` is close to the prior usable MED feel.
  - `4.0x` maps to `0.02` turn sensitivity, about `3.08x` faster than the old HIGH value `0.0065`.
  - JOY SIZE cycles numeric presets:
    - `90`, `110`, `130`, `150`
  - BUTTON SIZE cycles numeric presets:
    - `70`, `85`, `100`, `115`
  - OPACITY cycles numeric presets:
    - `30%`, `45%`, `60%`, `75%`
  - DEADZONE cycles numeric presets:
    - `4`, `8`, `12`, `16`
  - MINIMAP SIZE cycles numeric presets:
    - `68`, `82`, `96`

- Preserved legacy settings compatibility:
  - Old LOW/MED/HIGH/FAST settings migrate into the new numeric LOOK SPEED steps.
  - Old SMALL/MED/LARGE joystick/button/minimap/deadzone/opacity settings migrate into numeric presets.
  - New numeric values save to localStorage while legacy fields are still saved for compatibility.

- Tuned portrait minimap:
  - Portrait minimap is bottom-center.
  - Default portrait minimap is `68px`.
  - Portrait upgrade cap is `110px`.
  - Upgrades continue to improve information/reveal rather than making the minimap huge.
  - Landscape minimap remains small/capped at top-right.

- Preserved sprint behavior:
  - Mobile SPRINT remains tap burst.
  - Stamina blocks remain intact.
  - Desktop Shift hold sprint remains intact.

- Preserved menu art:
  - Existing Canned Run title/can/desert/strip mall/van menu art remains in place.
  - Options/menu screens remain usable.

- Removed mobile desktop-keybind footer during gameplay:
  - The desktop `WASD/QE/SPACE/SHIFT...` hint is now hidden on mobile so it no longer clips or overlaps the portrait minimap.

## WHAT WAS VERIFIED

### Static checks

- Required backup exists: PASS
- Node syntax check: PASS
  - `node_exit`: 0
- Inline `onclick`: 0
- `eval`: false
- External libraries/assets/backend URLs: none found

### Browser/runtime attach

- Page loads: PASS
- `window.CR` attaches: PASS
- `CR.getDebugState()` works: PASS
- `window.__crRuntimeErrors.length`: 0
- Canvas full-width/full-height check: PASS
- Fullscreen recommendation gate hidden: PASS
- LOOK SPEED label displays as `1.0x`: PASS

### Desktop smoke

Verified in browser:

- New run starts: PASS
- Keyboard movement works: PASS
- Desktop Shift sprint drains stamina: PASS
- Pickup works: PASS
- Handoff works: PASS
- Pause/resume works: PASS
- Results path works: PASS
- Runtime errors: 0

### Forced mobile portrait smoke

Used Chrome mobile emulation at `390×844`.

Verified:

- No fullscreen recommendation gate blocks play: PASS
- Title/menu usable: PASS
- Options usable: PASS
- NEW RUN starts: PASS
- Portrait layout activates: PASS
- 3D playfield cover-scales full height behind controls: PASS
- Portrait minimap bottom-center: PASS
  - `x`: 161
  - `y`: 754
  - `w`: 68
  - `h`: 68
- MOVE joystick bottom-left: PASS
- LOOK zone turns camera: PASS
- GIVE/SPRINT right side: PASS
- MAP button reachable/toggles map: PASS
- PAUSE reachable/toggles pause: PASS
- HUD readable below top buttons: PASS
- No desktop keybind footer overlapping minimap: PASS
- LOOK SPEED changes turn speed: PASS
- Max LOOK SPEED is much faster than old HIGH: PASS
  - max sensitivity: `0.02`
  - old HIGH reference: `0.0065`
  - ratio: about `3.08x`
- Runtime errors: 0

### Forced mobile landscape smoke

Used Chrome mobile emulation at `844×390`.

Verified:

- Landscape layout remains active: PASS
- NEW RUN starts: PASS
- Landscape minimap remains small/capped top-right: PASS
- MOVE/LOOK/GIVE/SPRINT/MAP/PAUSE remain reachable: PASS
- MAP toggles: PASS
- PAUSE toggles: PASS
- Fullscreen support remains available/optional: PASS
- Runtime errors: 0

### Visual proof

Saved proof:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-portrait-tuning.png`

Visual check confirmed:

- 3D view fills the full upper/middle and continues behind controls.
- No huge black gap/dead zone remains.
- Minimap is small and bottom-center.
- MOVE is bottom-left.
- GIVE/SPRINT are right-side stacked buttons.
- PAUSE/MAP are accessible at top corners.
- HUD is readable and does not overlap top buttons.
- Desktop footer is not visible.

Visual note:

- The 3D view appears faded/banded in the forced screenshot. This was noted visually but did not block the layout pass; no runtime/rendering error was detected.

## WHAT FAILED

- Initial visual proof showed the screenshot was captured while paused; the capture step was corrected.
- A later portrait proof showed the old desktop keybind footer overlapping/clipping near the minimap; the footer is now hidden on mobile gameplay.
- The portrait playfield initially left an opaque black bottom control strip; portrait rendering now cover-scales full height behind the controls.
- No final static, runtime, desktop, portrait, or landscape check is failing.

## CURRENT EXACT STATE

Updated game:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

Backup:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-portrait-tuning.html`

Report:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\PORTRAIT_TUNING_REPORT.md`

Proof:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-portrait-tuning.png`

Temporary CDP test files were removed after verification.

## REMAINING BLOCKERS

- No local blocker remains.
- Final real-phone behavior is still pending your Android Chrome retest.

## NEXT ACTIONABLE STEP

Please retest on Android Chrome:

1. Open the updated file from Telegram/Downloads.
2. Do not tap fullscreen first.
3. Tap NEW RUN in portrait.
4. Confirm portrait layout appears.
5. Confirm minimap is bottom-center and smaller.
6. Confirm MOVE and LOOK work.
7. Open OPTIONS.
8. Increase LOOK SPEED above the old HIGH equivalent.
9. Confirm turning is no longer sluggish.
10. Confirm fullscreen remains optional, not required.
11. Rotate landscape and confirm landscape still works.

## EVIDENCE

Static evidence:

```json
{
  "node_exit": 0,
  "onclick": 0,
  "eval": false,
  "externals": [],
  "backup": true
}
```

Desktop smoke evidence:

```json
{
  "errors": [],
  "fullWidth": true,
  "handoff": true,
  "keyboardMoved": true,
  "label": "1.0x",
  "newRun": true,
  "noPortGate": true,
  "pauseOff": true,
  "pauseOn": true,
  "pickup": true,
  "results": true,
  "runtimeAttach": true,
  "shiftSprint": true
}
```

Forced portrait/landscape summary:

```json
{
  "portrait_ok": true,
  "landscape_ok": true,
  "proof_exists": true,
  "portrait_minimap": {
    "ox": 161,
    "oy": 754,
    "W": 68,
    "H": 68,
    "cx": 195,
    "cy": 788
  },
  "portrait_layout": {
    "scale": 4.22,
    "dw": 1350.4,
    "dh": 844,
    "ox": -480.2,
    "oy": 0,
    "portrait": true,
    "playH": 844
  },
  "maxLookSens": 0.02
}
```

## TELEGRAM DELIVERY

Delivery package prepared for Telegram attachment:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
- `C:\Users\fallo\Documents\HermesProjects\canned-run\PORTRAIT_TUNING_REPORT.md`
- `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-portrait-tuning.png`

Delivery status for this report: final response attaches the updated game, report, and proof screenshot with `MEDIA:` paths.
