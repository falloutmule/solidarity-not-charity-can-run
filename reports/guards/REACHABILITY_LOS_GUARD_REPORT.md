# REACHABILITY / LOS GUARD REPORT

## WHAT WAS DONE

- Backup: `index.before-grid-los-reachability.html`
- Prior gameplay baseline: **movcoll1 / b504d63**
- **BUILD_ID:** `reachlos1`

### Helpers added
- `gridTraceClear(x1,y1,x2,y2, options)` — sampled LOS with structured `{clear, blocked, blockedAt, samples, outOfBounds}`
- `gridReachableFrom(startX, startY, options)` — BFS walkable flood fill
- `isReachableCell(tx, ty, reachable)`
- `interactionLineClear(playerX, playerY, targetX, targetY)`
- `crHarnessEssentialConnected(ex, ey, px, py)` — hall strict connectivity
- `CR.runReachabilitySelfCheck()` + Playwright `reachabilitySection()`

### GIVE behavior
**Changed:** `updateAim()` and `giveCan()` now require **range + `interactionLineClear()`** (wall-through GIVE blocked; range unchanged).

### Hall reachability fix (proven bug)
Row **6/8** divider tiles opened at pantry, gathering, and south-alcove doors so BFS from spawn reaches all Hall pickups/NPCs/exit (minimal map connectivity only).

## WHAT WAS VERIFIED

- Trace: clear corridor, wall block, diagonal wall, OOB safe (no throw)
- Normal run: **431** reachable cells; **0** unreachable pickups/NPCs measured
- Hall: **253** reachable cells; **all** pickups, NPCs, exit connected
- GIVE wall-block harness: pass
- `CR.runMovementCollisionSelfCheck()` — pass (prior card)
- `CR.runMobileControlReliabilitySelfCheck()` — pass
- `CR.runFullSelfCheck()` — pass
- `node tests/run_selfcheck_playwright.js` — exit **0**
- Hall E2E — pass

## WHAT FAILED

Nothing (after Hall door connectivity fix + OOB trace map).

## CURRENT EXACT STATE

Shipped gameplay: **reachlos1** (commit below).

## REMAINING BLOCKERS

None for this card.

## NEXT ACTIONABLE STEP

Optional: level-bake / spatial-audio cards from Q1K3 report (no UI/control changes).

## EVIDENCE

- `proof-reachability.json` — pass true
- `proof-reachability-hall.png`
- `proof-reachability-wallblocked.png`
- `proof-playwright-summary.json` — pass true

## GITHUB PAGES URL

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=5736c8c&mobile=on&portraitlayout=1`
- Self-check: `?selfcheck=1&v=5736c8c&mobile=on&portraitlayout=1`