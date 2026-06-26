# Q1K3 Learning Report — Mapping to SNC Can Run

**Study repo:** `falloutmule/q1k3-learning` (clone inspected at commit **8ee9348**)  
**SNC baseline referenced (not modified):** `solidarity-not-charity-can-run` **`controlrel1` / `bdc40b6`**  
**Scope:** Architecture study only — **no SNC code changes** in this card.

---

## Files inspected (exact paths)

| Area | Files / sections |
|------|------------------|
| Overview | `README.md` |
| Main loop | `source/game.js` (`game_run`, `game_init`, `game_spawn`, entity compaction L48–66) |
| WebGL | `source/renderer.js` (L1–354: shaders, `r_init`, `r_prepare_frame`, `r_end_frame`, `r_draw`, `r_push_block`, lights) |
| Physics / collision | `source/entity.js` (`_update_physics` L41–137, `_collides` L140–166, `_play_sound` L217–221) |
| Player input→move | `source/entity_player.js` (`_update` L25–112), `source/input.js` (full) |
| Map / collision data | `source/map.js` (`map_load_container` L6–91, `map_init` L93–126, `map_block_at` L128–135, `map_trace` L137–149, `map_block_at_box` L151–162) |
| Map build | `pack_map.c` (header + format comments mirrored in `map.js` L7–33), `build.sh` L3–14 |
| Entities | `source/entity.js` (base class), `source/entity_door.js`, `source/entity_enemy.js` (AI + LOS L75–127) |
| Audio | `source/audio.js` (`audio_init` L51–64, `audio_play` L66–78, synthesis L87+), `entity_t._play_sound` |
| Assets / boot | `source/main.js` (`game_load` L61–80), `source/model.js` (referenced via `model_load_container`) |
| Build pipeline | `build.sh` (full), `pack_js.php` (WebGL constant replacement L1–40+), `source/html_template.html`, `source/wrap_pre.js` / `wrap_post.js` |
| SNC contrast (read-only) | `canned-run/index.html` — `canStand` ~L2128, `update` ~L3635–3687, mobile `joy`/`inp` |

---

## 1. WebGL render pipeline lessons

**What q1k3 does**

- Single WebGL1 context, **inline GLSL strings** (`R_SOURCE_VS` / `R_SOURCE_FS` in `renderer.js` L11–139).
- **One interleaved vertex buffer** (`Float32Array`, 8 floats/vert: pos, UV, normal) with hard cap `R_MAX_VERTS` (L141–143).
- **Deferred draw list:** `r_draw()` only pushes tuples; `r_end_frame()` binds textures, uniforms, and issues `drawArrays` once per call (L168–283). Map geometry is pre-baked into the buffer at load (`map.js` `r_push_block`).
- **Per-frame lighting:** up to 32 lights in a uniform array; fragment shader does inverse-square + normal dot (L118–138).
- **Animation:** dual frame attributes `p2`/`n2` + mix factor `f` in VS (L18–37, L269–277).
- **WebGL minification:** `pack_js.php` replaces `gl.FOO` with numeric constants; `build.sh` uglify + **Roadroller** on final JS.

**Useful for SNC (without porting WebGL)**

- **Separate “collect draws” from “flush draws”** — SNC already batches via offscreen `buf` + `drawScene`; q1k3’s pattern reinforces: build a list of work, then one coherent pass (helps future perf harnesses and z-order bugs).
- **Cap worst-case geometry** — explicit max verts is a good mental model for `runRenderFailureSelfCheck` / sprite counts.
- **Sort by texture/material** before draw — q1k3 sorts map blocks by texture at pack time; SNC could sort sprite layers or minimap stamps if overdraw becomes hot.
- **Do not copy:** full 3D shader stack, dynamic lights, or WebGL migration — SNC is **Canvas2D raycast + sprites** by design.

---

## 2. Collision / physics lessons

**What q1k3 does** (`entity.js`)

- **Semi-implicit Euler:** accel → friction → velocity → position per tick (`game_tick`, capped at 0.05s in `game.js` L52).
- **Axis-separated resolution:** X, Z, then Y collisions with rollback to `lp` (last position).
- **Substepping:** `steps = ceil(move_dist / 16)` — prevents fast projectiles tunneling (L67–73).
- **Step-up:** `_step_height` (17 for player) allows climbing 1-block stairs without full jump physics (L85–97).
- **Ledge guard:** `_keep_off_ledges` + extra `map_block_at` probes under feet (L154–162).
- **Entity–entity:** sphere-ish AABB using `s.y` as radius proxy (L144–151).

**SNC today**

- **2D grid:** `canStand(x,y)` four corner samples against `isWall` (`index.html` ~L2128–2130).
- Movement is direct position update from angle + speed (no substeps in the same way).

**Useful for SNC**

- **Substep movement** when sprint speed is high or dt spikes — optional micro-steps along move vector before accepting new `(x,y)` (Kanban: “tunnel-safe movement”).
- **Separate horizontal vs vertical logic** — analog for SNC: resolve slide along walls (already implicit in ray/walk); q1k3’s rollback pattern is a clear template for “try move → if blocked, revert axis.”
- **Step height / stair metaphor** — only if SNC adds elevation later; not needed for flat mesa maps.
- **Do not copy:** gravity, jump, 3D AABB, projectile physics, bounce.

---

## 3. Map / collision data lessons

**What q1k3 does**

- **Authoring:** TrenchBroom `.map` → **`pack_map.c`** compiles to binary `.plb` (`build.sh` L7–14).
- **Runtime format** (`map.js` L7–33): blocks `(x,y,z,sx,sy,sz)` + texture sentinel `255`; **collision bitmap** `cm` — 128³ grid, **8 cells per byte** (L68–78).
- **Queries:** `map_block_at(x,y,z)` bit test (L128–135); `map_block_at_box` iterates grid cells overlapping AABB (L151–162).
- **LOS:** `map_trace(a,b)` — 16-unit steps along segment (L137–149). Used heavily in enemy AI.
- **Entities embedded** in map blob; `map_init` spawns via `spawn_class[]` table (L93–125).

**SNC today**

- Procedural `game.map` 2D char grid; custom levels via editor/seed; no offline binary packer.

**Useful for SNC**

- **Dual representation:** render data vs collision data — q1k3 builds both from one source. SNC could **bake** custom levels to `{ walkable[], spawn[], npc[] }` JSON at save time (smaller, faster load, easier harness).
- **Compact collision bitmap** for large custom maps (optional; only if map size grows).
- **`map_trace` equivalent** for 2D grid Bresenham/DDA — NPC “can see player,” sound occlusion, radar line — **no combat AI required**.
- **Spawn table by type id** — mirrors SNC district spawns / hall entities; good for data-driven `startRun` without string parsing.
- **Do not copy:** 3D voxel grid, TrenchBroom pipeline, `.plb` format as-is.

---

## 4. Entity lifecycle lessons

**What q1k3 does**

- `game_spawn(type, pos, p1, p2)` → `new type(...)` pushed to `game_entities` (`game.js` L30–34).
- Each frame: update living entities, **filter `_dead`** into new array (L59–66) — simple compaction, no object pool.
- Base `entity_t`: `_health`, `_die_at`, `_kill`, hooks `_init`, `_update`, `_receive_damage` (`entity.js`).
- **Groups:** `game_entities_enemies` / `game_entities_friendly` for collision masks (`entity_player.js` L12, `entity_door.js` L19–20).
- Particles via `game_spawn(entity_particle_t, ...)` (`entity.js` L193–205).

**SNC today**

- NPCs, pickups, popups as arrays on `game`; splice on expire; no unified `entity_t`.

**Useful for SNC**

- **Explicit dead flag + single compaction pass** per frame — reduces splice-in-loop bugs when many NPCs time out.
- **Spawn helper** with typed constructors — aligns with future “district entity packs” without OOP explosion.
- **Scheduled kill** (`_die_at`) — nice for timed FX / handoff messages (SNC already has `game.msgT`, popups).
- **Do not copy:** enemy class hierarchy, weapon/projectile entities, gib particles.

---

## 5. Input-to-movement lessons

**What q1k3 does**

- **Keyboard:** `ev.code` → compact `keys[]` via `keymap` char hack (`input.js` L10–57) — layout-neutral WASD/arrows.
- **Mouse look:** accumulates `mouse_x`/`mouse_y` per frame; **zeroed end of frame** (`game.js` L71–72).
- **Movement:** wish direction from keys, **rotated by yaw** (`entity_player.js` L31–41) — classic FPS strafe.
- **Held vs edge:** weapon wheel keys cleared each frame; action/jump are hold-to-test.

**SNC today**

- `inp` + `joy` abstraction; `syncInpFromJoy` / `clearMoveInput`; edge detect for map/pause/give; mobile pointer capture (`controlrel1`).

**Useful for SNC**

- **End-of-frame reset** for transient input (mouse delta, one-shot keys) — SNC already resets some mobile state; q1k3 pattern validates “consume then clear” for look drift.
- **Rotate wish vector by `player.angle`** before integrating position — SNC does equivalent via joy→inp; document as invariant in harness.
- **Separate look sensitivity from move speed** — q1k3 uses `m.value` + invert flag; SNC OPTIONS already mirror this (`mobileLookSens`, deadzone).
- **Do not copy:** mouse-look FPS binding, weapon switch wheel, jump/shoot buttons.

---

## 6. Audio / spatial lessons

**What q1k3 does**

- **Sonant-X** procedural buffers (`audio.js`); play via Web Audio graph.
- **`audio_play(buffer, volume, loop, pan)`** with `StereoPanner` (L66–77).
- **Per-entity:** `_play_sound` scales volume by distance 64→1200, pan from angle relative to camera yaw (`entity.js` L217–221).

**SNC today**

- `beep()` oscillator API; centralized `resumeAudioContext` / unlock gate (`index.html` SECTION 5 ~L2133+); no distance pan on NPC give.

**Useful for SNC**

- **Distance → volume curve** (`clamp(scale(dist, near, far, 1, 0))`) for give / district ambient / UI beeps near map features.
- **Stereo pan from world angle − player angle** — lightweight 2D version for hall or minimap events.
- **Keep** SNC’s gesture unlock gate — stricter than q1k3’s `audio_init` on load.
- **Do not copy:** Sonant music pipeline, full instrument synthesis, 3D audio.

---

## 7. Build pipeline lessons

**What q1k3 does** (`build.sh`)

1. **Native tool:** `gcc pack_map.c` → per-level `.plb`
2. **Concat assets:** maps → `build/l`, models → `build/m`
3. **Concat JS** in fixed order (`wrap_pre` … `wrap_post`)
4. **`pack_js.php`:** WebGL enum compression
5. **UglifyJS** + **Roadroller** (extreme zip-oriented compression)
6. **`sed` embed** into `html_template.html` → `build/index.html`
7. **zip:** `index.html` + `l` + `m`; **advzip** recompress

**SNC today**

- Single shipped `index.html`; `src/` scaffold + `SOURCE_RELEASE_POLICY.md`; Playwright proofs on root artifact; `BUILD_ID` cache bust.

**Useful for SNC**

- **Offline compile step for data** (maps, levels) without splitting runtime — e.g. Node script: custom level → embedded base64 blob in HTML (like q1k3’s external `l`/`m` but 2D).
- **Ordered concat + one minify** when/if modular extract returns — `build.sh` order list is a template.
- **Separate DEBUG fetch paths** (`main.js` L68–69 `/*DEBUG[*/ 'build/' + /*]*/ 'l'`) — pattern for dev vs prod asset paths.
- **Do not copy:** Roadroller/js13k size war, PHP packer, shipping separate binary assets unless GitHub Pages + caching strategy is designed.

---

## 8. What should NOT be copied

| q1k3 feature | Why not for SNC |
|--------------|-----------------|
| WebGL 3D renderer | SNC identity is Canvas2D top-down / ray aesthetic + mobile HUD |
| Weapons, projectiles, enemies, AI combat | Out of product scope (solidarity / can-run loop) |
| Gravity, jump, 3D stairs physics | Flat mesa gameplay |
| Dynamic lights in shader | SNC uses 2D lighting/fog tricks on canvas |
| Full entity combat damage / gib FX | No combat |
| js13k Roadroller + 13KB budget tooling | SNC targets maintainability + Hermes harness, not size contest |
| TrenchBroom 3D maps | 2D procedural + editor is the correct toolchain |
| Pointer-lock FPS mouse on canvas | SNC mobile-first touch + portrait dock |
| Splitting `index.html` now | Constitution / release policy explicitly single-file ship |

---

## 9. Suggested future Kanban cards for SNC

Prioritized **actionable** cards (study-derived; no implementation in this card):

1. **2D movement substeps** — After q1k3 `entity.js` L67–73 pattern: N steps along move vector per `update(dt)`; harness asserts no `canStand` violations through walls at sprint speed.

2. **Grid line-of-sight helper** — Port `map_trace` idea to 2D tile DDA; use for NPC awareness / radar / “helped from distance” rules; unit test in `runLevelSelfCheck` or new `runLosSelfCheck`.

3. **Custom level bake pipeline** — Editor export → compact JSON/binary chunk embedded in save or level slot (q1k3 `pack_map.c` + `map_load_container`); runtime load only collision + spawn table.

4. **Spatial beep helper** — `beepAt(worldX, worldY, ...)` with volume/pan from q1k3 `_play_sound` math; optional OPTIONS toggle.

5. **Entity compaction pass** — Single-frame filter for NPCs/popups with `_dead` flag instead of scattered splices; document in constitution.

6. **Fixed dt cap audit** — q1k3 caps tick at 0.05s (`game.js` L52); verify SNC `update(dt)` uses same cap everywhere (mobile background tabs).

7. **Draw-list / flush instrumentation** — Extend `runRenderFailureSelfCheck` with counts (sprites, rays, minimap stamps) inspired by `R_MAX_VERTS` budgeting.

8. **Offline map validator** — CLI script (Node or small C like `pack_map.c`) that validates custom levels: unreachable tiles, NPC off walkable, hall doors — CI optional.

9. **Data-driven spawn registry** — Table of spawn type ids → factory functions (q1k3 `spawn_class` in `map.js` L97–115) for districts / seeded runs.

10. **Dev/prod asset path switch** — DEBUG comment pattern from `main.js` for future `dist/` or external level packs without changing Pages URL.

---

## Verification (this card)

- [x] Inspected `q1k3-learning` source at **8ee9348**
- [x] Cited exact files/sections above
- [x] **No** `canned-run/index.html` changes
- [x] Harness **not** run (not required)

---

## Summary

q1k3 is a **js13k WebGL FPS** optimized for size and 3D collision quality. SNC Can Run should **borrow patterns** (substep movement, LOS on grid, spawn tables, spatial audio curves, offline map bake, entity lifecycle discipline, build-time data compile) and **reject the stack** (WebGL, combat, 3D maps, size obfuscation). The highest-value near-term items for SNC are **2D substeps**, **LOS helper**, and **custom-level bake/validate** — all compatible with single-file ship and existing Playwright harness.