# Canned Run — Graphics Pass Report

**Task:** Upgrade graphics/visual identity to a Grand Junction / Western Colorado cityscape while preserving the verified playable prototype.
**File:** `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
**Backup:** `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-graphics.html`
**Date:** 2026-06-22
**Status:** COMPLETE — graphics upgraded, zero regressions, zero JS errors, verified live.

---

## What was done

All gameplay, collision, and sprite-projection logic from the verified base was preserved verbatim. Only rendering and procedural assets changed. Single self-contained HTML file maintained; no external assets/libraries added; no Google imagery used (all textures/sprites/sky are Canvas-generated pixel art).

### 1. Procedural wall textures (per-column texture sampling in the raycaster)
Replaced the flat-color `fillRect` wall draw with standard Wolfenstein-style textured slices:
- For each ray hit, compute the exact wall contact coordinate (`wallX`) → select `texX` column from a 64×64 texture canvas, with correct mirroring per hit side.
- Draw a 1px-wide slice via `drawImage(tex, texX, 0, 1, 64, col, drawStart, 1, sliceH)` (vertical texture scaling).
- Per-cell shade variation and y-side darkening preserved via a black-alpha overlay; distance fog preserved via a fog-color overlay.
- z-buffer logic unchanged.

Nine procedural wall types generated at startup:
- **tan stucco** (sun-bleached adobe, seams, patches) — the dominant Grand Junction building material
- **red/brown brick** (offset rows, mortar, color variation)
- **dark storefront glass** (mullions, reflections, faded sign band)
- **chain-link fence** (green-tinted diamond mesh, rails)
- **mural wall** (faded painted shapes)
- **service/garage roll-up door** (horizontal seams, service window)
- **blank concrete** (noise, hairline cracks)
- **faded signage/billboard** (panel, posts, worn text shapes)
- **van side** (body, windows, wheels — used as a parking-lot blocker wall)

City generator weighted toward stucco + brick (GJ strip-mall feel); parking lots now spawn fence/van/concrete decor.

### 2. Better sprite art (billboards, world-coordinate projection intact)
Redrew all people with shadows, shoes, hands, and distinct accessories so they're recognizable at speed:
- **hungry** — red shirt, brown hat
- **family** — blue adult + small child beside
- **elder** — purple coat, cane, hat
- **volunteer** — green with reflective vest stripe + smile

New/updated props and pickups: distinct pantry **can** (blue label, glow halo), **crate**, **shopping cart**, **dry grass clump**, **utility pole** (tall), **faded sign post**, **bus stop shelter**, and a glowing **exit portal** arch. Sprite projection math (`depth`/`hscr` from camera plane) and per-column z-buffer occlusion were left untouched; sprites also receive distance fog now.

### 3. Horizon and sky
Pre-rendered sky canvas (320×100), rebuilt only when the modifier changes:
- Warm dusty gradient (pale blue → peach → cream) for clear/desert.
- Distant mesa silhouettes: two bands — a hazy far mauve ridge and a closer brown band with flat tabular tops (Book Cliffs / Grand Mesa inspired).
- Low desert haze line.
- Rainy modifier uses a cool grey-blue sky; maze uses a hazier variant.

### 4. Floor / road readability
Asphalt gradient (dark grey, darker near bottom) with faint road center-line flecks near the horizon; distance fog tinted warm-dusty for clear and cool-grey for rainy.

### 5. HUD readability
Restructured into two bordered panels with a warm amber border:
- Main panel: labeled fields (TIME / CANS / PEOPLE / STAM) with color coding (time turns orange when low, stamina bar uses block glyphs, cans highlighted).
- Meta panel: DISTRICT + modifier + score multiplier, SEED + SCORE, and owned-upgrades recap.
- Reticle: crosshair tick marks + colored ring (green when you have enough cans, orange when not) with a readable needs label ("HUNGRY · needs 1 can · you have 3") on a contrast background.
- Message banner and score popups now have background plates for readability.

### 6. Grand Junction flavor props
Added a `game.props` array of **non-blocking** decor billboards (grass, poles, signs, carts, crates, bus stops), spawn-validated for clearance and placed on reachable cells so they never sit inside walls. They never affect collision (safest per the brief). Vans/dumpsters-as-walls handled via the WALL.VAN/concrete map cells.

### 7. Visual feedback
- Pickup flash (warm white overlay, decays).
- Handoff pulse (green overlay, decays).
- Exit floor glow halo when the exit is active and visible.
- Radar pulse ring on the minimap when the radar upgrade triggers.
- "not enough cans" popup + needs label preserved.

---

## What was verified (live in browser)

Run via `file:///` in a headless browser; DevTools console captured throughout.

1. **Zero JS errors** across start, play, pickup, handoff, quota, exit, upgrade, district transition, pause, and restart (checked repeatedly, including after every major action).
2. **All 9 procedural wall textures** generate correctly (64×64 canvases).
3. **Sky canvas** builds correctly (320×100) for the clear modifier.
4. **Render output:** 100% non-black frame, 35.7% tan pixels (stucco/desert palette present) — textured walls and sky both drawing.
5. **Cans world-fixed (no regression):** recorded a can at `[30.5,18.5]`; faced it (screenX=160 center), moved forward (depth 33.6→32.5, got closer), turned 45° (screenX slid to -77). **`worldUnchanged: true`** across move + turn.
6. **Spawn clearance (no regression):** all 16 cans, 8 NPCs, 11 props, and exit pass `hasClearance` (`allClear:true`), all on reachable cells (987 reachable).
7. **Wall occlusion (no regression):** hungry NPC behind a wall renders at 0.02% green — hidden behind the wall, not showing through.
8. **Pickup:** collected a 2-can pickup → `cans 0→2`.
9. **Aim/reticle + handoff:** on a hungry NPC → `aimNpc:"hungry"`, handoff → `helped:1, delivered:1`, pickup flash + handoff pulse triggered.
10. **Full loop:** quota 5/5 met → exit activated → reached exit → upgrade offered (sprint/hand/map) → picked 1 → **district 1→2** (new city: 18 cans, 9 NPCs, quota 6), score 1380.
11. **Pause:** holds the timer; resume continues.
12. **Restart:** reseeds, resets to district 1, props respawn.

---

## What failed

Nothing. No regressions; no new errors.

---

## Current exact state

- `index.html`: single self-contained file, ~54.3 KB, opens directly in a browser.
- No external assets, no libraries, no build step, no Google imagery.
- Concept preserved: flat Doom/Wolfenstein raycaster speedrun; collect cans, hand to people, hit quota, reach exit.
- Graphics visibly upgraded with a Grand Junction / Western Colorado desert-city identity (tan stucco, brick, storefronts, chain-link, murals, mesa horizon, asphalt, dusty fog).
- All verified gameplay behaviors (movement, pickup, handoff, quota, exit, upgrade loop, seed replay, modifiers) intact.
- Backup of pre-graphics file retained at `index.before-graphics.html`.

---

## Remaining blockers

None.

---

## Next actionable step

Optional polish (not required for completion):
- Add a few intentional *blocking* decor props (parked vans / dumpsters as circular collision obstacles) for stronger physicality, validated through `canStand`.
- Vary mesa silhouettes per district for a sense of travel.
- Add a subtle ambient wind/dust particle layer for the clear modifier.

---

## Evidence

- Game file: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
- Pre-graphics backup: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-graphics.html`
- Graphics proof screenshot: `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-graphics-pass.png` (49 KB — textured scene with sky/mesa horizon, HUD panels, minimap)
- This report: `C:\Users\fallo\Documents\HermesProjects\canned-run\GRAPHICS_REPORT.md`
- Live verification logs: captured in-session via DevTools console (9 wall textures ok, sky ok, 100%/35.7% render fill, cans world-fixed `worldUnchanged:true`, all-clear spawns, 0.02% occluded-green, full loop district 1→2 score 1380, pause/restart ok, zero JS errors).
