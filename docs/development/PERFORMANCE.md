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

The query-gated `?perfprobe=1` overlay records each delivery gap above 33 ms with the measured work from the **immediately preceding frame**. The structured `CR.crPerfProbeGetReport().longFrame` data contains the long-gap p95/worst plus preceding-frame p95/worst timing for simulation, scene rendering, UI, bitmap work, and mobile layout. The phone overlay shows the long-frame sample/gap line and, where the canvas has room, a compact `S` (simulation), `R` (renderer), and `U` (UI) phase p95/worst line; the report contains every phase.

`inputcadence1` exposed a missing adapter as `look … ?` values, so its supplied samples are not cadence evidence. `inputcadence2` provides the missing read-only adapter and shows `look n/g <events>/<gap-p95-ms> d <angle-delta-p95>/<largest-jump-rad> r <repeated-frames>` on roomy overlays. It derives values from existing query-gated touch-event and rendered-angle histories; it does not alter input handling, camera motion, rendering, or pacing.

The repaired Samsung captures returned LOOK gap p95 values of about 82 ms, with largest rendered-angle jumps of about 0.05-0.066 rad and 77-112 repeated rendered-angle frames. That cadence matches the reported stutter. The same captures kept the measured game phases below budget; one rare preceding renderer sample reached 29.2 ms, but it did not explain the pervasive LOOK cadence.

## Rejected raw-input candidate

`rawlook1` changed only the dedicated `#mlookpad` touch/pen path to consume browser raw pointer samples. The user reported no physical improvement. Its moving capture still showed sparse LOOK delivery, including an event-gap p95 of about 165.8 ms. The candidate is rejected.

`inputfallback1` restores the exact preceding `pointermove` route while preserving all cadence and long-frame diagnostics. The rollback changes no renderer, resolution, HUD, fixed-step, save, layout, or frame-pacing behavior.

## Current no-code experiment

The supplied captures retained Chrome browser chrome above the game. Test the same `inputfallback1` production artifact first in its current browser view and then after using the game's FULLSCREEN action. In each state, perform simultaneous MOVE + LOOK near a building and in open space for about 15 seconds.

- **Fullscreen clearly smoother:** the next hypothesis is Android browser-chrome/compositor delivery, not renderer or input simulation work.
- **Fullscreen the same or worse:** test the exact same production build in Samsung Internet before another source card.
- **Do not add a frame cap, revive 320x200, or make another input or renderer change from this result alone.**
