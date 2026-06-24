# Solidarity Not Charity Can Run — GitHub Pages Deploy Report

## WHAT WAS DONE

- Renamed the public-facing game title from the old working title to:
  - **Solidarity Not Charity Can Run**
- Kept **SNC Can Run** as shorthand only.
- Updated public/user-facing title strings in `index.html`:
  - HTML/browser `<title>`
  - hidden/optional fullscreen hint title text
  - responsive/mobile title menu text
  - canvas/main menu title screen text
  - single-file header comment
- Left internal save/debug names alone where changing them could risk existing localStorage compatibility.
- Added repo docs:
  - `README.md`
  - `.gitignore`
  - `GITHUB_PAGES_DEPLOY_REPORT.md`
- Created the preferred public GitHub repo:
  - `falloutmule/solidarity-not-charity-can-run`
- Pushed the latest single-file game to `main`.
- Enabled GitHub Pages from:
  - branch: `main`
  - source path: `/` repository root
- Set repo homepage to the Pages URL.
- Verified the live GitHub Pages deployment.

## WHAT WAS VERIFIED

### Local file/name verification

- `index.html` exists: PASS
- `index.html` is the latest portrait-tuning build plus public rename: PASS
- Browser title says `Solidarity Not Charity Can Run`: PASS
- Main menu visible title says `Solidarity Not Charity Can Run`: PASS
  - Visual check confirmed it appears cleanly as:
    - `Solidarity Not Charity`
    - `Can Run`
- No user-facing `Canned Run` title remains in `index.html`: PASS
- Node syntax check passes: PASS
- Inline `onclick`: 0
- `eval`: false
- External libraries/assets/backend URLs: none found
- Game remains a single self-contained `index.html`: PASS

### Git verification

- Local repo initialized in:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run`
- Remote:
  - `https://github.com/falloutmule/solidarity-not-charity-can-run.git`
- Branch:
  - `main`
- Initial deploy commit pushed:
  - `23fb24b79403095a0eb4ca4113259756cc4de7ec`
- Initial deploy short hash:
  - `23fb24b`
- Repo visibility:
  - public
- Repo description:
  - `Solidarity Not Charity Can Run — one-file browser game`

### Pages verification

- Pages source:
  - Deploy from branch
  - `main`
  - `/` repository root
- Pages URL:
  - `https://falloutmule.github.io/solidarity-not-charity-can-run/`
- Cache-busted tested URL:
  - `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=23fb24b`
- HTTP status from Pages URL: PASS
  - First several polls returned 404 while GitHub Pages was provisioning.
  - Attempt 7 returned HTTP 200.
- Page title from live Pages URL:
  - `Solidarity Not Charity Can Run`
- Live page loaded game runtime/debug API: PASS
- No obvious 404/missing asset errors: PASS
- Live deployed title screen visually checked: PASS
- Live desktop browser smoke:
  - NEW RUN starts: PASS
  - keyboard movement works: PASS
  - console/runtime errors: 0
- Live GitHub Pages forced mobile smoke via Chrome/CDP:
  - portrait viewport `390×844`: PASS
  - landscape viewport `844×390`: PASS
  - title correct: PASS
  - no old public title: PASS
  - NEW RUN starts: PASS
  - portrait layout activates: PASS
  - portrait minimap formula gives bottom-center `68×68`: PASS
  - landscape minimap formula gives top-right capped `68×68`: PASS
  - mobile controls visible: PASS
  - synthetic LOOK drag changes yaw: PASS
  - runtime errors: 0

### LocalStorage note

Moving from downloaded `content://` / local-file play to GitHub Pages changes browser origin.

Existing phone saves/stats from the downloaded file will not automatically carry over to:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/`

That is expected and acceptable for this deployment. No migration was added.

## WHAT FAILED

- The first GitHub Pages API call failed because Git-Bash/MSYS rewrote `/repos/...` as a filesystem path.
  - Fixed by using `gh api repos/falloutmule/solidarity-not-charity-can-run/pages` without the leading slash.
- GitHub Pages returned temporary HTTP 404 while provisioning.
  - It became HTTP 200 on polling attempt 7.
- The first live CDP mobile attempt targeted a Chrome extension background page instead of a normal tab.
  - Fixed by creating a fresh CDP tab target directly.
- The first live mobile smoke did not force the minimap visible and checked the wrong yaw field.
  - Fixed by forcing `showMinimap=true`, computing the minimap rectangle with the deployed `drawMinap()` formula, and checking `player.angle`.
- No final local, git, Pages, desktop, or live mobile-emulation check remains failing.

## CURRENT EXACT STATE

Final public game title:

- **Solidarity Not Charity Can Run**

Allowed shorthand:

- **SNC Can Run**

Local project path:

- `C:\Users\fallo\Documents\HermesProjects\canned-run`

Primary local game file:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

Repo URL:

- `https://github.com/falloutmule/solidarity-not-charity-can-run`

Git remote:

- `https://github.com/falloutmule/solidarity-not-charity-can-run.git`

Branch:

- `main`

Pages source:

- branch: `main`
- folder: `/` repository root

Pages URL:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/`

Cache-busted tested URL:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=23fb24b`

Initial deployed game commit:

- `23fb24b79403095a0eb4ca4113259756cc4de7ec`

Required local report:

- `C:\Users\fallo\Documents\HermesProjects\canned-run\GITHUB_PAGES_DEPLOY_REPORT.md`

## REMAINING BLOCKERS

- No deployment blocker remains.
- Real-phone behavior from GitHub Pages is still pending Travis's Android Chrome retest.
- Existing downloaded-file/content-origin localStorage saves will not transfer to GitHub Pages automatically.

## NEXT ACTIONABLE STEP

Use this link now instead of downloading `index.html`:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/`

Android Chrome retest checklist:

1. Open GitHub Pages URL on Android Chrome.
2. Tap NEW RUN in portrait.
3. Confirm title says `Solidarity Not Charity Can Run`.
4. Confirm portrait layout.
5. Confirm look speed can be increased.
6. Confirm fullscreen is optional.
7. Confirm local saves/stats are new for this URL because localStorage is per-site origin.

## EVIDENCE

Local static/name check:

```json
{
  "index_exists": true,
  "title_tag": true,
  "public_title_count": 3,
  "old_public_title_matches": [],
  "node_exit": 0,
  "inline_onclick": 0,
  "eval_present": false,
  "external_urls": [],
  "single_html": true,
  "readme_exists": true,
  "gitignore_exists": true
}
```

Local browser smoke:

```json
{
  "documentTitle": "Solidarity Not Charity Can Run",
  "hasFullTitleInHTML": true,
  "oldTitleVisible": false,
  "crAttach": true,
  "started": true,
  "keyboardMoved": true,
  "errors": []
}
```

Initial git push evidence:

```text
[main (root-commit) 23fb24b] Publish Solidarity Not Charity Can Run to GitHub Pages
3 files changed, 2940 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 index.html
```

Pages API evidence:

```json
{
  "build_type": "legacy",
  "source": {
    "branch": "main",
    "path": "/"
  },
  "url": "https://falloutmule.github.io/solidarity-not-charity-can-run/"
}
```

HTTP polling evidence:

```text
attempt 1-6: HTTP 404 while provisioning
attempt 7: HTTP 200, title_present=True
```

Live Pages browser smoke:

```json
{
  "href": "https://falloutmule.github.io/solidarity-not-charity-can-run/?v=23fb24b",
  "documentTitle": "Solidarity Not Charity Can Run",
  "origin": "https://falloutmule.github.io",
  "hasFullTitleInHTML": true,
  "oldTitleVisible": false,
  "externalResources": [],
  "crAttach": true,
  "started": true,
  "keyboardMoved": true,
  "errors": []
}
```

Live Pages mobile-emulated smoke summary:

```json
{
  "portrait_ok": true,
  "landscape_ok": true,
  "portrait": {
    "title": "Solidarity Not Charity Can Run",
    "started": true,
    "portrait": true,
    "mini": {
      "ox": 161,
      "oy": 754,
      "W": 68,
      "H": 68,
      "cx": 195,
      "cy": 788
    },
    "miniBottomCenter": true,
    "controlsVisible": true,
    "lookTurned": true,
    "errors": []
  },
  "landscape": {
    "title": "Solidarity Not Charity Can Run",
    "started": true,
    "portrait": false,
    "mini": {
      "ox": 766,
      "oy": 54,
      "W": 68,
      "H": 68,
      "cx": 800,
      "cy": 88
    },
    "miniLandscapeTopRight": true,
    "controlsVisible": true,
    "lookTurned": true,
    "errors": []
  }
}
```

## GITHUB PAGES URL

Repo URL:

- `https://github.com/falloutmule/solidarity-not-charity-can-run`

GitHub Pages URL:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/`

Cache-busted tested URL:

- `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=23fb24b`

Manual steps still required:

- None for deployment.
- Real Android Chrome retest by Travis is pending.
