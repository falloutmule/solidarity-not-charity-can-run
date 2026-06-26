WHAT WAS DONE

- Backup: index.before-portrait-layout-match.html (161885 bytes)
- Portrait zones retuned to mockup: FPV top, ~19.5% height wide minimap strip, stats band, control dock
- Controls: GIVE upper-left of dock; MOVE large bottom-left; red MENU (#mportmenu) centered low (~82% into dock, partly below fold); SPRINT large right; LOOK smaller circle offset up-left overlapping SPRINT (overlap preserved, not separated)
- Portrait: MAP button (#mm) hidden; minimap always drawn in portrait strip (no toggle needed)
- Stats: condensed 3-line panel, bold 14px / 13px fonts, blue rule lines
- Minimap: fills portrait strip with blue border frame
- District gen: interior alleys only on maze modifier (more rectangular blocks otherwise)
- BUILD_ID stamped 5c8dec5; pushed to main (commits 5c8dec5, 1b42858)

WHAT WAS VERIFIED

- Static: backup exists; node --check _chk.js OK; onclick 0; eval false
- Local file:// + CR.getLayoutProof() at 390×844 portrait after startRun:
  - portrait true; minimapRect.h 245; mapButtonHidden true
  - giveRect top ~778; moveRect top ~1140; menuDom top ~1169 (low/off-screen)
  - overlap.sprintLook true (intentional overlap)
- Desktop smoke: syntax OK; game loads via file URL; startRun OK
- GitHub push: main updated

WHAT FAILED

- Hermes browser screenshot used wide desktop viewport — visual proof PNG does not match phone aspect; use device or ?layoutdebug=1 on phone for pixel proof
- localhost:8787 ERR_EMPTY_RESPONSE from isolated browser (not blocking deploy)

CURRENT EXACT STATE

- Repo: falloutmule/solidarity-not-charity-can-run @ 1b42858 (BUILD_ID 5c8dec5 in index.html)
- index.html ~161394 bytes; backup on disk
- Portrait layout code: portraitLayout(), drawPortraitStatsPanel, applyMobileControlSettings, #mportmenu

REMAINING BLOCKERS

- Travis real-phone compare to mockup (placement fidelity) — desktop automation cannot sign off
- User may send updated mockup picture for fine-tuning offsets

NEXT ACTIONABLE STEP

- Phone test: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=5c8dec5&mobile=on&layoutdebug=1
- Confirm overlap, MENU low, no MAP button, large minimap; send screenshot deltas vs mockup

EVIDENCE

- getLayoutProof JSON (local): sprintLook overlap true, menu top > innerHeight, miniH ~245
- proof-portrait-layout-match.png (partial desktop capture — reference only)
- index.before-portrait-layout-match.html

GITHUB / PAGES URLS

- https://falloutmule.github.io/solidarity-not-charity-can-run/
- https://falloutmule.github.io/solidarity-not-charity-can-run/?v=5c8dec5&mobile=on
- https://falloutmule.github.io/solidarity-not-charity-can-run/?v=5c8dec5&mobile=on&layoutdebug=1