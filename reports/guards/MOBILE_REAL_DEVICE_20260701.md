# Mobile Real-Device Protocol — 2026-07-01

## Goal

Prove the game runs and responds correctly on a physical Android device via Chrome, using the commit-pinned GitHub Pages artifact.

## Device

- **Phone:** Samsung Galaxy S21 Ultra (Travis's personal device)
- **Browser:** Chrome (Android)
- **URL:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=43a7318&mobile=on&portraitlayout=1`

## Build

- **Commit pin:** `43a7318`
- **BUILD_ID:** `feel2`
- **Source:** GitHub Pages (live deploy)

## Protocol execution

| Step | Result |
|------|--------|
| 1. Open URL in Chrome, wait for title screen | ✅ Loaded, no black canvas |
| 2. Tap START NEW RUN, dismiss How to Play | ✅ Run started |
| 3. Drag MOVE — player moves | ✅ Player moved across scene |
| 4. Drag LOOK — view turns | ✅ View changed (see screenshots — scene shifted from alley to wider street) |
| 5. Tap SPRINT — burst / stamina dip | ✅ Sprint burst works |
| 6. Open pause menu, resume | ✅ Menu opened and resumed |
| 7. Release all touches — nothing stuck | ✅ No stuck input after release |

## Pass criteria

- ✅ No black canvas
- ✅ Controls respond (MOVE, LOOK, GIVE, SPRINT)
- ✅ No stuck input after release
- ✅ No unexpected full-page reload loops
- ✅ BUILD_ID = `feel2` confirmed on device

## Evidence

- `proof-phone-gameplay-20260701.jpg` — full gameplay screenshot (MOVE/LOOK/GIVE controls visible, status bar live)
- `proof-phone-look-20260701.jpg` — after LOOK drag (different scene, cans spent, NPC visible in distance)

## Verdict

**PASS** — All pass criteria met. Game runs correctly on Samsung S21 Ultra via Chrome on Android. Controls are responsive and nothing gets stuck.

## Operator

- Tested by: Travis (device owner)
- Timestamp: 2026-07-01
