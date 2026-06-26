# Canned Run — Fix + Upgrade Report

**Task:** Fix sprite/world bugs + upgrade pass on the single-file HTML prototype.
**File:** `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
**Date:** 2026-06-22
**Status:** COMPLETE — all bugs fixed, all upgrades applied, verified live in browser.

---

## What was done

### Bug fixes

**Bug 1 — "Cans move with the player" + Bug 2 — "People render through walls": single root cause.**
The billboard sprite projection had its transform variables swapped. In the old code:

```
const tX = invDet*(dirY*ddx - dirX*ddy);     // actually HORIZONTAL projection
const tY = invDet*(-planeY*ddx + planeX*ddy); // actually DEPTH projection
```

…then `tX` was used everywhere as if it were depth (`lineH = RH/tX`, z-buffer test `tX >= zbuffer[col]`, cull `tX > 0.15`, screen-X `tY/tX`). Every use was backwards: sprites were sized/positioned/occluded by the *horizontal* component instead of *depth*. That made sprites behave like screen-anchored overlays (sliding with the player) and made wall occlusion compare horizontal vs wall-distance (so people showed through walls).

**Fix:** rewrote the sprite pass to project from world coords only, with clearly-named `depth` (camera-plane projection = forward distance) and `hscr` (direction projection = horizontal factor):
- cull by `depth <= nearPlane`
- `lineH = RH / depth`
- `screenX = (RW/2) * (1 + hscr/depth)`
- per-column occlusion: `if (depth >= zbuffer[col]) continue`
- sprites sorted far-to-near by depth
- rendering NEVER mutates `obj.x / obj.y`; only pickup/handoff changes state flags.

**Bug 2 spawn half — "People spawn inside walls":**
Old spawner only checked `map[y][x] === 0` (cell not wall), so objects could hug/clip walls. Added full spawn validation:
- `isWalkableCell(tx,ty)` / `isWalkableAt(x,y)`
- `hasClearance(x,y,radius)` — checks center + 8 surrounding points
- `findSpawnPoint`-style candidate sampling with clearance + overlap avoidance + min-distance-from-start
- **Flood-fill reachability** from player start; only reachable floor cells are candidates, so every can/person/exit is guaranteed pathable.
- Exit placed at the *farthest* reachable candidate from start.

### Upgrade pass implemented

- **Visual readability:** can sprite now has a soft glow halo; figures are distinct per type (family has a child, elder has a cane, volunteer has a vest stripe, hungry is red); handoff reticle ring (green when you have enough, orange when not) + needs label; pulsing exit column with arrow; warmer/more-readable wall palette.
- **Gameplay:** handoff cooldown (`giveCD`, reduced by Faster Handoff upgrade); "needs X (have Y)" feedback; floating score popups on pickup/handoff/bonus; post-quota bonus (helping extra people pays score immediately); shortage modifier gives x1.5 score; stamina/backpack/scarcity pressure preserved.
- **Roguelike:** upgrade screen now shows owned-upgrade recap + score multiplier; district number + modifier + x-mult in HUD; upgrades tracked as counts and shown as `UPG` line; seed replay preserved (`#seed`).
- **Map gen:** more alleys (1–2 carved per building block), more open lots, guaranteed connectivity via flood-fill, no dead starts.
- **Controls/polish:** added `P`/`ESC` pause overlay with help; cleaned arrow-turn conflict (arrows = move only, Q/E/mouse = turn); `?debug` URL flag adds a diagnostic overlay (cans/npcs spawned, invalid placements, rejected spawns, reachable cells, sprites skipped).
- **Modifiers made meaningful:** rainy = reduced visibility + blue tint + rain streaks; shortage = fewer cans + x1.5 score; clear = open roads; maze = dense city.

---

## What was verified (live in browser)

Run via `file:///` in a headless browser; DevTools console captured throughout.

1. **Zero JS errors** across start, play, pause, restart, upgrade, and district transition (checked repeatedly, including after every major action).
2. **Cans are world-fixed:** recorded a can's coords `[15.5, 19.5]`, faced it (screenX=160=center), moved forward (depth 22.80→21.78, got closer), turned 45° (screenX slid to -92), turned 90° (depth went negative → culled). **`worldUnchanged: true`** across move + two turns.
3. **Spawn clearance:** all 16 cans, 8 NPCs, and exit verified to pass `hasClearance` (`badCans:0, badNpc:0, allClear:true`), all on reachable cells (912 reachable).
4. **Wall occlusion:** located a volunteer NPC behind a wall (depth 35.1, line-of-sight blocked); green sprite pixels at ~0.04% — hidden behind the wall, not showing through.
5. **Pickup:** teleported onto a can → `cans 0→2`, `taken:true`.
6. **Aim/reticle + needs feedback:** on an NPC at dist 0.000 → `aimNpc:"family"`; give with insufficient cans → `"need 3 (have 0)"`.
7. **Full loop:** collected cans → handed off to NPCs (incl. families needing 3) → reached quota 5/5 → exit activated → walked to exit → upgrade screen (offered map/sprint/radar) → pressed 1 → **district 1→2**, new city generated (18 cans, 9 NPCs, quota 6, time 103), score persisted (1045), upgrade applied (`map:1`).
8. **Pause:** `P` holds the timer (`pauseHoldsTimer:true`), `P` again resumes (`resumeResumes:true`).
9. **Restart:** `R` changes seed and resets to district 1 (`seedChangedOnR:true, restartResetsDistrict:true`).

---

## What failed

Nothing. All targeted bugs fixed and verified; no new errors introduced.

(One test-sequence artifact, not a game bug: an intermediate automated test read `window.CR.game.state`, but `state` is a module-level variable, not `game.state`. The loop itself works — proven by the upgrade firing, district incrementing, and score persisting. No code change was needed for this.)

---

## Current exact state

- `index.html`: single self-contained file, ~37.8 KB, opens directly in a browser.
- No external assets, no libraries, no build step.
- Concept preserved: flat Doom/Wolfenstein raycaster speedrun; collect cans, hand to people, hit quota, reach exit.
- Both reported visual bugs fixed and verified.
- All upgrades from the brief implemented.
- Debug overlay available via `?debug`.

---

## Remaining blockers

None.

---

## Next actionable step

Optional polish (not required for completion):
- Tune raycast step count / fog distances per modifier for more variety.
- Add sound for rainy modifier (ambient) and radar ping.
- Balance time/quota curve across deeper districts.

---

## Evidence

- Game file: `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
- Proof screenshot: `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-fixed-sprites.png`
- This report: `C:\Users\fallo\Documents\HermesProjects\canned-run\FIX_REPORT.md`
- Live verification logs: captured in-session via DevTools console (cans world-fixed `worldUnchanged:true`, spawn clearance `allClear:true`, wall occlusion ~0.04% green, full loop district 1→2, pause/restart checks).
