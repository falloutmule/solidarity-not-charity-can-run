# Sound / feedback pass — SNC Can Run

**Card closed:** 2026-06-26 — CI green on **`d06b2ee`**.

## WHAT WAS DONE

- Backup: `index.before-sound-feedback-pass.html` (repo root, local; gitignored).
- **BUILD_ID** `visualfix1` → **`sound1`**.
- Added **`CR_SOUND_FEEDBACK`** contract and procedural cue table (`_SOUND_CUE_DEFS`).
- **`crTriggerSoundCue`**, **`crSoundEnabled`**, **`crSoundFeedbackCueIds`** — Web Audio oscillator beeps only; no external audio files.
- Harness mutes gameplay sound when **`_crHarnessDepth > 0`**; cue self-check uses **`testOnly`** so CI does not blare.
- **OPTIONS → SOUND ON/OFF** (`option-sound`); persisted in existing options/settings object (not game save / **SAVE_VERSION** unchanged).
- HUD popups for: **+CAN**, **HELPED**, **NO LINE OF SIGHT**, **EXIT READY**, **DISTRICT COMPLETE**, **UPGRADE** (subtle `addPopup`, no layout shift).
- Wired cues from real gameplay: collect, GIVE success/blocked/unavailable/need cans, quota/exit ready, district complete, upgrade, menu/help/pause, sprint denied (mobile + desktop shift).
- **`CR.runSoundFeedbackSelfCheck()`** + folded into **`CR.runFullSelfCheck()`**.
- Playwright **`soundFeedbackProofShots`** + proof PNGs/JSON.

## WHAT WAS VERIFIED

- **Static:** single-file `index.html`; no external runtime assets; no `<audio>` tags; title **Solidarity Not Charity Can Run**.
- **Gameplay unchanged:** portrait layout shell, control dock, MENU/minimap placement, Hall E2E, procedural map gen, movement/collision, reachability, full-run progression, **SAVE_VERSION** / save-load format — only additive sound/HUD feedback and options **`soundOn`** field.
- **Visual:** **`CR_VISUAL_READABILITY`** style **`visualfix1`** retained; screen path stripe still off; rectangle regression still gated on **`BUILD_ID sound1`**.
- **Harness (local):** `npm run test:selfcheck` → **`pass: true`**.
- **Harness (CI):** workflow **SNC Can Run Selfcheck** — **success** on push **`d06b2ee`**.
- Gates: full selfcheck, sound feedback, visual rectangle, visual readability, onboarding, full-run E2E, mobile controls, movement, reachability, multiseed, Hall, isolation, render guard, no external requests.

## WHAT FAILED

- Nothing for this card (local + CI).

## CURRENT EXACT STATE

| Field | Value |
|-------|--------|
| **BUILD_ID** | `sound1` |
| **Gameplay commit** | `d06b2ee` (`d06b2eec530dcaa82a3eff2caf5196a05fd3b21e`) |
| **Prior baseline** | `visualfix1` / `fd487c2` |
| **Web Audio** | Yes (generated tones only) |
| **Sound toggle** | Yes — OPTIONS **SOUND ON/OFF** |
| **Save format** | Unchanged |
| **External audio/assets** | None added |

## REMAINING BLOCKERS

- None.

## NEXT ACTIONABLE STEP

- None for this card. New work only when explicitly requested.

## EVIDENCE

- **Gameplay commit:** `d06b2ee`
- **Proof JSON (local / CI artifact):** `proof-sound-feedback.json`, `proof-sound-feedback-selfcheck.json`, `proof-playwright-summary.json` (includes `soundFeedback` section)
- **Proof PNGs:** `proof-feedback-can.png`, `proof-feedback-exit-ready.png`, `proof-feedback-give-blocked.png`, `proof-feedback-district-complete.png`
- **Local harness:** `npm run test:selfcheck` → `{"pass":true}`
- **GitHub Actions:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28268576866  
  - Job: **selfcheck** — success (~1m47s)  
  - **headSha:** `d06b2eec530dcaa82a3eff2caf5196a05fd3b21e`
- **Artifact (confirmed on run):** **`snc-can-run-proof-artifacts`** — uploaded from `selfcheck` job (`actions/upload-artifact@v5`)
- **Play URL:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=d06b2ee&mobile=on&portraitlayout=1
- **Self-check URL:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=d06b2ee&mobile=on&portraitlayout=1

### Feedback cues added

1. Can collected — `canCollect`
2. GIVE/help succeeds — `giveSuccess` (+ HELPED)
3. GIVE blocked (LOS) — `giveBlocked` (+ NO LINE OF SIGHT)
4. GIVE unavailable — `giveUnavailable`
5. Not enough cans — `giveNeedCans`
6. Quota / exit ready — `quotaExitReady` (+ EXIT READY)
7. District complete / exit entered — `districtComplete` (+ DISTRICT COMPLETE)
8. Upgrade chosen — `upgradeChosen` (+ UPGRADE)
9. Menu / help / pause — `menuHelp`
10. Sprint denied (low stamina) — `sprintDenied`