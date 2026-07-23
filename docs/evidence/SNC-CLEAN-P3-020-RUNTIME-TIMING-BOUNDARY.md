# SNC-CLEAN-P3-020 — Runtime Timing Boundary

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)

## Protected production path

| Responsibility | Exact owner | Boundary |
|---|---|---|
| requestAnimationFrame owner | `src/js/game-22-section-13-main-loop.js` | `frame(now)`, lines 404–496; boot schedules it at line 496 |
| fixed-step state and render-pose history | `game-22` | lines 251–402 |
| accumulator / fixed simulation | `game-22` | `crStepSimulationFixed(frameDt)`, lines 354–382 |
| authoritative update | `src/js/game-20-section-11-update-input.js` | `update(dt)`, lines 391–482 |
| scene render | `src/js/game-16-section-7-render.js` | `drawScene(now, renderPose)`, beginning line 90 |
| presentation composition | `game-22` | `frame`: scene, canvas copy, HUD/overlays, then next RAF |

## Required invariants before harness movement

- one `requestAnimationFrame(frame)` schedule per frame;
- `crApplyPendingInputActions()` precedes `crStepSimulationFixed()`;
- simulation calls `update(CR_FIXED_STEP_DT)` only from the fixed-step loop;
- render pose is derived after stepping and is render-only;
- `drawScene(now, renderPose)` receives that single selected pose;
- no harness extraction may alter accumulator, clamp, step cap, input ordering, angle selection, or canvas composition.

## Harness boundary

The first harness-only helper begins at `game-22:534` (`getLayoutProof`). The real timing path ends before that boundary. Current production timing code still has two harness couplings: the frame leak guard at line 407 and renderer sample reset at `game-16:91`; those must be replaced with a no-op production seam before moving harness code.

## Focused timing protection

`npm.cmd run test:render-interpolation` passed on the unchanged baseline. It verified 60/72/90/120/144 Hz, irregular cadence, 40 ms and clamped 300 ms frames, authoritative-state parity, collision parity, lifecycle resets, and authoritative immediate angle policy.

## Result

**PASS.** The real RAF → input actions → fixed simulation → render-pose → scene/presentation path is identified and protected. No harness code has been moved.
