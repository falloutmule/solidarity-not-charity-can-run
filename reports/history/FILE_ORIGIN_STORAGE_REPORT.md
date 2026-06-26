# CARD 7 — File origin storage fallback (P2)

## WHAT WAS DONE

- Backup: `index.before-file-origin-storage.html`
- Added `IS_FILE_ORIGIN` (`location.protocol === 'file:'`)
- Added `FILE_ORIGIN_SAVE_NOTE` and `fileOriginMenuNoteHTML()` for mobile/title `rmenu`
- Title screen (HTML rmenu + canvas desktop menu) shows warning only on `file:`
- Comment on persistence block: `lsGet`/`lsSet` already catch errors (no throw)
- `CR.getControlDockRectProof()` exposes `isFileOrigin` and `fileOriginSaveNote`
- `BUILD_ID` → `file1`

## WHAT WAS VERIFIED

- Static: `IS_FILE_ORIGIN`, note text, `lsSet` try/catch, `onclick=0`
- `file:///.../index.html?mobile=on`: `protocol=file:`, `isFileOrigin=true`, rmenu contains warning, `__crRuntimeErrors` empty
- `http://127.0.0.1:8791/index.html?mobile=on`: `protocol=http:`, `isFileOrigin=false`, `fileOriginSaveNote=null`, rmenu has no warning

## WHAT FAILED

- Nothing in scope

## NOT TESTED

- Real device opening downloaded `content://` file
- QuotaExceededError path (only generic catch)

## CURRENT EXACT STATE

- GitHub Pages / `http(s):` unchanged except new build id when deployed
- Local `file://` players see menu note; saves still best-effort via existing helpers

## GITHUB PAGES URL (after push)

https://falloutmule.github.io/solidarity-not-charity-can-run/?v=file1&mobile=on