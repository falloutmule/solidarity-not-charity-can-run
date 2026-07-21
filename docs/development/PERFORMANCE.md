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

## Display-refresh result

The target Samsung device did not expose a usable refresh-rate control, so a locked-60-Hz comparison could not be performed. The user repeated the same simultaneous MOVE + LOOK observation and the stutter remained. That is not evidence that 60 Hz would be the same or worse, so it does not authorize a frame cap.

## Current diagnostic experiment

The query-gated `?perfprobe=1` overlay now records each delivery gap above 33 ms with the measured work from the **immediately preceding frame**. The structured `CR.crPerfProbeGetReport().longFrame` data contains the long-gap p95/worst plus preceding-frame p95/worst timing for simulation, scene rendering, UI, bitmap work, and mobile layout. The phone overlay shows the long-frame sample/gap line and, where the canvas has room, a compact `S` (simulation), `R` (renderer), and `U` (UI) phase p95/worst line; the report contains every phase.

Capture one moving sample near a building and one in an open area. Interpret the result as follows:

- **Preceding scene or simulation p95/worst rises with long gaps:** isolate that phase in the next single hypothesis card.
- **Preceding phases remain small while gaps persist:** treat browser/display frame delivery as the leading hypothesis; do not add a cap without a separately testable candidate.

No renderer, input, resolution, HUD, or pacing behavior changes are included in this diagnostic build.
