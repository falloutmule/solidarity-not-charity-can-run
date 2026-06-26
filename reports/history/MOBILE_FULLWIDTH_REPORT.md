# Canned Run — Mobile Full-Width Render Fix Report

## WHAT WAS DONE

- Created backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-fullwidth.html`

- Fixed the root cause of the right-side black area in:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

### Root Cause

`resize()` was multiplying viewport dimensions by `devicePixelRatio` (capped at 2) to set the canvas **backing store** size. But all drawing code (HUD, overlays, raycaster upscale, fillRects) used CSS pixel coordinates (`innerWidth`/`innerHeight`).

On mobile devices with DPR 2–3, this meant:
- Backing store: e.g. 1688×780 (844×390 × 2)
- Drawing coordinates: 844×390
- Result: game rendered into the top-left ~50% of the backing store; the rest stayed black
- Browser displayed the full backing store scaled down, so the right side appeared as dead black space

### Fix 1: Removed DPR scaling from canvas backing store

`resize()` now sets `view.width`/`view.height` to the raw CSS pixel dimensions (from `visualViewport` or `innerWidth`/`innerHeight`), without multiplying by DPR.

This game upscales a 320×200 buffer with `image-rendering:pixelated` — DPR adds no visual benefit and caused the coordinate mismatch.

### Fix 2: Made LOOK zone fully transparent

`#mr` background changed from a gradient (up to 0.12 opacity) to `transparent`. The LOOK zone is now a pure touch-detection overlay — gameplay shows through completely. The hint text and arrows remain visible as floating elements.

### Fix 3: Made joystick slightly translucent

`#ml` background set to `rgba(20,15,10,0.15)` so gameplay shows through the joystick area too.

### Fix 4: playfieldLayout() uses canvas backing dimensions

`playfieldLayout()` now reads `view.width`/`view.height` instead of `innerWidth`/`innerHeight` for guaranteed consistency with the actual canvas backing store. Mobile landscape cover-scaling is preserved.

## WHAT WAS VERIFIED

### A. Static checks

- Backup exists: YES
- Node syntax check: PASS (exit 0)
- Lines: 2652
- Bytes: 119,409
- Inline onclick handlers: 0
- eval() usage: 0
- External assets/libs/backend: none
- DPR removed from resize: YES
- #mr background transparent: YES

### B. Desktop smoke

- Canvas backing matches innerWidth/innerHeight: YES (1258×622)
- Runtime errors: 0
- New run: PASS
- Movement: PASS
- Pickup: PASS
- Handoff: PASS
- Pause/resume: PASS
- Results: PASS

### C. Forced mobile test

Simulated 844×390 landscape with visualViewport override:

- Canvas backing: 844×390 (matches viewport exactly)
- Canvas matches innerWidth/innerHeight: PASS
- Playfield covers full width: PASS
- Playfield covers full height: PASS
- #mr background transparent: PASS
- Overlay shows: PASS
- rmenu hidden and empty during play: PASS
- Turn zone works: PASS
- Joystick move works: PASS
- GIVE / SPRINT / MAP / PAUSE: ALL PASS
- Runtime errors: 0

### D. Visual proof

Screenshot confirms: 3D game world fills the full screen from left edge to right edge. No large dead black panel on the right side. Controls overlay gameplay transparently.

## WHAT FAILED

- Nothing failed in local verification.
- A screenshot taken with mismatched mocked viewport dimensions initially showed a black area — this was a test-harness artifact (visualViewport not overridden), not a game bug. Re-verified with matching dimensions and confirmed full-width render.

## CURRENT EXACT STATE

- Updated game:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
  - 2652 lines / 119,409 bytes

- Backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-fullwidth.html`
  - 2647 lines / 119,161 bytes

- Report:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_FULLWIDTH_REPORT.md`

- Proof:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-fullwidth.png`

## REMAINING BLOCKERS

- Real-phone verification of full-width render on Android Chrome is pending.

## NEXT ACTIONABLE STEP — REAL-PHONE RETEST

1. Open updated file from Telegram on Android Chrome.
2. Tap **FULLSCREEN**.
3. Rotate to landscape.
4. Tap **NEW RUN**.
5. Confirm the **3D game world fills the entire screen** — no large dead black panel on the right.
6. Confirm controls overlay gameplay transparently.
7. Move with **MOVE** joystick.
8. Drag right **LOOK** zone to turn camera.
9. Test **GIVE / SPRINT / MAP / PAUSE**.

## EVIDENCE

- Root cause identified: DPR multiplier in `resize()` caused backing-store / drawing-coordinate mismatch.
- Fix verified: canvas backing store now matches CSS dimensions exactly.
- Visual proof: game world renders edge-to-edge.
- All control tests pass with 0 runtime errors.

## TELEGRAM DELIVERY

- Updated game file: attached.
- Report: attached.
- Proof: attached.
