# q1k3 lessons (reference only)

## Policy

- **q1k3** is a **reference** single-file JS game — **not** a port target for SNC Can Run.
- Do not swap engines or adopt q1k3’s full architecture without an explicit product decision.

## Lessons already applied

| Lesson | SNC application |
|--------|------------------|
| Substep movement / collision | `movePlayerWithCollision`, `movcoll1` guard |
| Grid trace / reachability | `gridTraceClear`, `gridReachableFrom`, `reachlos1` |
| Multi-seed validation | `runProceduralLevelValidationSelfCheck`, `multiseed1` |

## Future possible lessons (not committed)

- Better render batching / fewer per-frame allocations  
- Spatial audio patterns  
- Cleaner entity lifecycle for pickups/NPCs  

## Report

Full study: **`../reports/reference/Q1K3_LEARNING_REPORT.md`**.