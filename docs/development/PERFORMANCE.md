# Mobile Performance

## Current decision

Production remains at a 400×250 internal render resolution with interpolated angle handling and subpixel projection. The 320×200 comparison was the same or possibly worse for pacing and visibly worse for image quality, so it is closed as a default or adaptive-resolution path.

## Samsung evidence

During simultaneous MOVE + LOOK, the target Samsung device still showed visible stutter. A mixed-session profiler capture reported:

| Metric | Result |
|---|---:|
| FPS | 85.7 |
| Frame average / p95 / worst | 11.67 / 16.7 / 33.5 ms |
| Frames above 33 / 50 ms | 2 / 0 |
| Simulation average / p95 / worst | 0.03 / 0.17 / 0.8 ms |
| Fixed-step drops | 0 |
| Scene / minimap average | 4.42 / 0.24 ms |
| Mobile UI average / p95 | 0.03 / 0.5 ms |

The frame distribution was strongly bimodal while measured simulation, HUD, mobile UI, and bitmap work stayed below budget. This supports uneven high-refresh/browser cadence as the next hypothesis, not continuous 400×250 overload. The sample was mixed and ended stationary, so it is not motion-isolated proof.

## Next experiment

Use the unchanged production URL and compare:

1. the phone's current high-refresh mode;
2. the phone temporarily locked to 60 Hz;
3. approximately 15 seconds of simultaneous MOVE + LOOK near a building in each mode.

The physical verdict is authoritative:

- **60 Hz clearly smoother:** authorize one query-gated 60 fps render-pacing candidate.
- **Ambiguous:** repeat once under comparable conditions.
- **Same or worse:** do not add a cap; extend only the existing profiler with phase p95/worst and long-frame correlation.

No renderer, input, resolution, HUD, or pacing changes are combined in one candidate.

