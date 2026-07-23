# P7-010A — Main-loop ownership

Baseline: `aef4489` (`chromeinput2`). This is a read-only map.

| Group | Source range | Direct consumers | Shared state / ordering | Tests | Risk |
|---|---:|---|---|---|---|
| Portrait geometry | 7–115 | mobile controls, minimap, HUD, playfield | DOM viewport, safe area, options, user overrides | mobile UI cache | R |
| Portrait chrome / stats / FPV overlay | 117–213 | frame, HUD, perf probe | canvas, portrait geometry, game/player | perf probe, normal smoke | L2 |
| Playfield layout | 215–230 | frame | canvas dimensions, portrait geometry | normal smoke | R |
| Fixed step / render pose | 233–383 | frame, perf probe, interpolation test | accumulator, player/game, render-angle history | render interpolation, far-field angle | R |
| RAF frame / presentation | 386–478 | browser only | input → fixed step → render pose → drawScene → presentation | inert-adapter retirement, normal smoke | R |
| Seed helper | 480–487 | menu/action code | game seed, input display | no narrow owner test | U |
| Read-only diagnostics | 489–528 | `SNCDiagnostics.getSnapshot()` only | reads runtime state and fixed-step snapshot; no mutation | production smoke | **L1** |

## Protected timing path

`frame(now)` retains this exact sequence: pending input actions → fixed-step accumulator/update → interpolated pose → selected angle → `drawScene()` → canvas presentation → HUD/overlays/menu → next RAF. It is not a first extraction candidate.

## Selected candidate for synthesis

Move the terminal diagnostics group beginning at `function getDebugState(){` through the frozen `window.SNCDiagnostics` assignment into `src/js/game-22a-runtime-diagnostics.js`, immediately after `game-22-section-13-main-loop.js` in the manifest.

- The group has one public consumer surface: bounded read-only `SNCDiagnostics`.
- It declares no mutable runtime API and writes no gameplay, persistence, renderer, input, or timing state.
- Its dependencies are lexical globals already initialized before the terminal main-loop source finishes.
- RAF is scheduled before the group but cannot execute until all concatenated scripts have loaded.
- A temporary-copy experiment proved splitting this terminal text at the exact boundary and inserting an adjacent manifest input regenerates identical production bytes, SHA-256, and Git blob.

No other main-loop group is approved as a first Phase 7 seam.
