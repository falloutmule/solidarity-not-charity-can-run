# Sound / feedback pass — SNC Can Run

## WHAT WAS DONE

- Backup: `index.before-sound-feedback-pass.html` (repo root, 2026-06-26).
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
- **Gameplay:** layout/controls/MENU/minimap/Hall/map/movement/save unchanged; visual readability contract **`visualfix1`** retained; screen path stripe still off.
- **Harness:** `npm run test:selfcheck` → **`pass: true`** (local).
- Gates: full selfcheck, sound feedback, visual rectangle, visual readability, onboarding, full-run E2E, mobile controls, movement, reachability, multiseed, Hall, isolation, render guard, no external requests.

## WHAT FAILED

- Nothing on local harness for this card.

## CURRENT EXACT STATE

| Field | Value |
|-------|--------|
| **BUILD_ID** | `sound1` |
| **Prior baseline** | `visualfix1` / `fd487c2` |
| **Gameplay commit** | *(set after push — see EVIDENCE)* |
| **Web Audio** | Yes (generated tones only) |
| **Sound toggle** | Yes — OPTIONS **SOUND ON/OFF** |
| **Save format** | Unchanged |
| **External audio/assets** | None added |

## REMAINING BLOCKERS

- None locally. Await GitHub Actions on pushed commit.

## NEXT ACTIONABLE STEP

- Confirm CI green + proof artifact **`snc-can-run-proof-artifacts`** on pushed SHA.

## EVIDENCE

- **Backup:** `index.before-sound-feedback-pass.html`
- **Proof JSON:** `proof-sound-feedback.json`, `proof-sound-feedback-selfcheck.json`
- **Proof PNGs:** `proof-feedback-can.png`, `proof-feedback-exit-ready.png`, `proof-feedback-give-blocked.png`, `proof-feedback-district-complete.png`
- **Local harness:** `npm run test:selfcheck` → `{"pass":true}`
- **GitHub Actions:** *(URL after push)*
- **Artifact:** `snc-can-run-proof-artifacts`
- **Play URL:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<COMMIT>&mobile=on&portraitlayout=1`
- **Self-check URL:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<COMMIT>&mobile=on&portraitlayout=1`

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