# Mobile real-device protocol (Samsung / Android Chrome)

Repeatable manual proof path for phone testing. No substitute for Playwright; complements it for touch feel and address-bar behavior.

## Device setup

- Samsung (or Android) phone, **Chrome** (not in-app WebView unless explicitly testing WebView)
- Same build as CI: GitHub Pages URL with `?v=<full-git-sha>` or local LAN `index.html?mobile=on&portraitlayout=1`

## Steps (one session)

1. Open URL in Chrome; wait for title screen.
2. Tap **START NEW RUN**; dismiss **How to Play** if shown.
3. Portrait: verify MOVE + LOOK + GIVE + SPRINT visible; drag MOVE — player moves; drag LOOK — view turns.
4. Tap SPRINT once — burst indicator / stamina dip.
5. Open pause menu from portrait menu control; resume.
6. Optional: add to home screen; relaunch; confirm save/continue still works if you had a run.

## Evidence to capture

| Artifact | Name |
|----------|------|
| Full-screen gameplay photo | `proof-phone-gameplay-<date>.jpg` |
| After LOOK drag (same spot) | `proof-phone-look-<date>.jpg` |
| Chrome version + device model | note in `reports/guards/MOBILE_REAL_DEVICE_<date>.md` |

## Pass criteria

- No black canvas; controls respond; no stuck MOVE after release
- LOOK changes facing without stuck touch id
- No unexpected full-page reload loops

## Fail handling

Record URL, `BUILD_ID` from in-game/about if visible, Chrome version, and exact step that failed. File under `reports/guards/` and link in Telegram handback.