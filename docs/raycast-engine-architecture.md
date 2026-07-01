# Raycast engine architecture — SNC Can Run

Protected baseline for the **Solidarity Not Charity Can Run** Canvas 2D raycasting engine. This document locks the current working architecture so future gameplay, visual, mobile, and AI-agent edits do not accidentally break rendering, touch controls, saving, or single-file GitHub Pages release behavior.

**This card does not replace the engine.** Edit `src/` and rebuild per `SOURCE_RELEASE_POLICY.md`; do not hand-edit root `index.html` for gameplay.

---

## 1. Purpose

SNC Can Run uses a **Canvas 2D software raycaster** for first-person district runs: grid world, pickups, NPCs, props, exit, procedural facades, and a DOM/CSS mobile dashboard. The engine shape is already correct for the product scope.

This architecture doc:

- States the **current** stack and data flow as the protected baseline.
- Maps **source slices** to responsibilities (split `src/` → root `index.html`).
- Lists **raycaster invariants** and **render order** that must not regress silently.
- Names **future cards** without implementing them here.

Goal: reduce AI-edit regressions at system seams (viewport, z-buffer, sprites, touch, storage, packed release).

---

## 2. Current engine stack

| Layer | Implementation |
|-------|----------------|
| **Renderer** | Canvas 2D software raycaster |
| **Internal render resolution** | **320×200** (`RW` × `RH`) |
| **Presentation** | Scaled visible canvas (`#view`) from internal buffer |
| **World model** | Grid map + pickups + NPCs + props + exit |
| **Depth** | 1D per-column `zbuffer` (`Float32Array(RW)`) |
| **Sprites** | Billboard projection after wall pass |
| **UI** | DOM / CSS mobile overlay + canvas HUD |
| **Input** | Keyboard + pointer/touch abstraction |
| **Audio** | Procedural WebAudio with centralized unlock gate |
| **Save** | `localStorage` with file-origin warning / fallback behavior |
| **Build** | Split `src/` → root `index.html` single-file release |
| **Verification** | Playwright + `window.CR` self-checks |

Research alignment (do not paste long external excerpts into the repo):

- Single-file games fail most often at **seams**: viewport sizing, canvas backing pixels, touch/gesture handling, fullscreen assumptions, storage, packed release workflows.
- Raycasters need explicit ownership of wall cast, per-column depth, sprite pass, HUD/minimap, mobile layout.
- **Human-readable source first**, one-file release second.
- **PWA installability** is not part of the strict single-file baseline.
- **Android Chrome real-device** proof matters; Playwright screens, it does not replace phone feel.
- **Do not minify** during active architecture or gameplay iteration.

---

## 3. One-way engine flow

Protected pipeline:

```text
RAW INPUT
  ↓
SEMANTIC ACTIONS
  ↓
SIMULATION / GAMEPLAY
  ↓
RAYCAST WORLD RENDER
  ↓
PRESENTATION SCALE
  ↓
HUD / MINIMAP / DOM OVERLAYS / DEBUG
```

Rules:

```text
Render code may read state but must not mutate gameplay state.
Input code may collect raw state but should not move entities directly.
Simulation consumes semantic actions.
```

Violations (common AI-edit failures): writing player position from `drawScene`, mutating `game.map` from minimap draw, applying gameplay upgrades from render-only polish passes.

---

## 4. Source ownership map

Build order is **`src/build-manifest.json`** (concatenated into one `<script>` in root `index.html`).

### Core engine and world

| File | Responsibility |
|------|----------------|
| `src/js/game-00-preamble.js` | AI-safe constitution, runtime error capture |
| `src/js/game-01-section-0-canvas-resolution.js` | Visible canvas, internal buffer `buf`, `zbuffer` |
| `src/js/game-02-section-0b-fullscreen-api-helpers.js` | Fullscreen API helpers (optional UX) |
| `src/js/game-03-section-0c-debug-flag.js` | Debug / URL flags |
| `src/js/game-04-section-1-seeded-rng-mulberry32.js` | Seeded RNG |
| `src/js/game-05-section-2-game-state.js` | Durable game state, player state, config |
| `src/js/game-06-section-2b-mobile-touch-input.js` | Touch / pointer / keyboard input, mobile layout settings |
| `src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js` | HTML menu overlay (mobile path) |
| `src/js/game-08-section-2d-mobile-init.js` | Mobile init / mode wiring |
| `src/js/game-09-section-3-city-generation.js` | Procedural district map generation |
| `src/js/game-10-section-3b.js` | Custom levels / level data (part 1) |
| `src/js/game-11-section-3b.js` | Custom levels / level data (part 2) |
| `src/js/game-12-section-4-collision-walk-helpers.js` | Walkability, collision, LOS, reachability, movement substeps |
| `src/js/game-13-section-5-audio-centralized-audiocontext-unlock-.js` | WebAudio unlock and procedural sound |
| `src/js/game-14-section-5b-local-persistence.js` | Save/load / `localStorage` handling |
| `src/js/game-15-section-6-procedural-assets.js` | Procedural textures, sprites, wall/facade assets |
| `src/js/game-16-section-7-render.js` | DDA wall cast, zbuffer fill, sprite projection, world render |
| `src/js/game-17-section-8-minimap.js` | Minimap only |
| `src/js/game-18-section-9-hud-reticle-popups.js` | HUD, reticle, popups |
| `src/js/game-19-section-10-gameplay-actions.js` | Core gameplay verbs |
| `src/js/game-20-section-11-update-input.js` | Menu handling, gameplay update input, state transitions |
| `src/js/game-21-section-12-overlays.js` | Overlays and self-check UI |
| `src/js/game-21a-section-12b-perf-probe.js` | Performance probe (debug-gated) |
| `src/js/game-22-section-13-main-loop.js` | Frame loop, portrait layout, final presentation, `window.CR` export |

### Non-JS shipped pieces

| File | Responsibility |
|------|----------------|
| `src/styles/game.css` | Layout, mobile chrome, touch-action policy |
| `src/html/body.html` | DOM shell, overlay nodes |
| `src/template.html` | HTML wrapper for build |
| `tools/build-single-file.js` | Combine manifest → `index.html` |

**Policy:** Gameplay changes go in `src/`; run `npm run build` before commit of `index.html`. `npm run build:check` must pass when both are tracked.

---

## 5. Raycaster invariants

```text
RAYCASTER INVARIANTS

1. Wall pass runs before sprite pass.
2. Wall pass writes zbuffer[col] for every rendered column.
3. Sprite pass compares projected sprite depth against zbuffer[col].
4. Sprite fog / tint / outlines must not be applied to the full transparent sprite rectangle.
5. Wall fog belongs to wall columns. Sprite fog must be masked or skipped unless proven safe.
6. Renderer must not mutate world, player, pickups, NPCs, props, save, options, or input state.
7. UI / HUD / minimap must not change raycaster wall distance or sprite depth decisions.
8. Mobile layout must not change internal render resolution or raycaster math.
9. Any change to DDA, projection, zbuffer, sprite sorting, wall texturing, facade composition, fog, or minimap requires screenshot proof.
10. Any change to input/control layout requires pointer/multitouch proof.
```

Internal resolution **320×200** and `zbuffer.length === RW` are part of the contract unless a dedicated migration card changes them with full harness proof.

---

## 6. Protected render order

Exact draw order for world presentation (see `drawScene` and related paths in `game-16-section-7-render.js`):

```text
1. sky / ceiling
2. floor / ground plane
3. wall DDA columns
4. wall material / facade overlays
5. distance fog on wall columns
6. sprite collection
7. sprite sort far-to-near
8. sprite projection
9. per-column sprite clipping against zbuffer
10. sprite outlines / reticle / target affordances
11. screen-space weather / vignette / flash
12. HUD
13. minimap
14. mobile dashboard chrome
15. DOM overlays / menus / debug
```

Steps 1–11 target the internal buffer (`bctx` / `buf`); step 12+ may use visible canvas and DOM. Do not insert gameplay simulation between wall and sprite passes.

---

## 7. Architecture debt / future cards

**Not implemented on this card** — recommended sequence:

### 1. `RAYCAST_INVARIANT_SELFCHECK`

- Add `CR.runRaycasterInvariantSelfCheck()`.
- Validate zbuffer presence, per-column sprite occlusion, halo guard, render-order proof.

### 2. `VIEWPORT_AUTHORITY_OBJECT`

- Centralize `visualViewport`, safe area, DPR, CSS size, backing size.
- Proof that canvas and controls stay aligned on resize.

### 3. `SEMANTIC_ACTION_MAP`

- Single action object consumed by simulation, e.g.:

```js
const actions = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  sprintPressed: false,
  sprintHeld: false,
  givePressed: false,
  mapPressed: false,
  pausePressed: false
};
```

### 4. `FIXED_STEP_SIMULATION`

- Accumulator sim only after current feel is snapshotted; requires movement/feel proof.

### 5. `WORLD_LAYER_ADAPTER`

- Adapter over current `game.map`; no immediate typed-array migration.

### 6. `TYPED_WORLD_MIGRATION`

- Only after adapter exists and tests pass.

---

## 8. Failure modes to guard

| Class | Symptom / risk |
|-------|----------------|
| Canvas CSS/backing mismatch | Blur, wrong aspect, shimmer |
| DPR blur or non-integer shimmer | Moiré on facades / floor |
| `100vh` / browser-bar jump | Controls off-screen on mobile |
| Safe-area overlap | PAUSE/MAP/stats under notch or gesture bar |
| `pointercancel` / gesture theft | Stuck move or look |
| Invisible overlays blocking input | LOOK dead while elements “look” fine |
| Sprite halos | Fog on transparent bbox |
| Through-wall sprites | zbuffer or sort regression |
| Save failure under `file://` | Silent loss; warn on `file:` origin |
| DOM layout thrash | Jank on options open |
| Background-tab `dt` jump | Physics spikes |
| Fullscreen assumptions on iOS | Broken enter/exit UX |

Cross-reference: `docs/failure-mode-catalog` themes in Hermes skill repo; SNC guard reports under `reports/guards/`.

---

## 9. Test protocol

Every **gameplay-affecting** future card must run from repo root:

```bash
npm run build
npm run build:check
npm run test:selfcheck
```

**Doc-only cards** (like this architecture guard) must still record:

```bash
npm run build:check
npm run test:selfcheck
git status --short
git diff --stat
```

If dependencies are missing, report the exact command failure — do not claim verification.

Play URLs and baseline `BUILD_ID` / commit: see **`PROJECT_STATUS.md`**.

---

## Related docs

- [ai-safe-constitution.md](ai-safe-constitution.md)
- [harness-overview.md](harness-overview.md)
- [mobile-layout-and-controls.md](mobile-layout-and-controls.md)
- [github-pages.md](github-pages.md)
- `src/README.md` — edit source, not hand-patch shipped HTML