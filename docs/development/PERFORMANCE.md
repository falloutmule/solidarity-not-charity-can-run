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

## Current input-delivery candidate

`rawlook1` changes only the dedicated `#mlookpad` touch/pen path. When the browser emits `pointerrawupdate`, it consumes that event's chronological coalesced sample sequence and marks raw input as authoritative for that drag. The corresponding `pointermove` is then ignored, preventing duplicate camera deltas. If a browser does not provide raw updates, the existing `pointermove` handling remains unchanged.

This candidate does not change render resolution, renderer work, HUD work, fixed-step simulation, touch layout, save state, or render pacing. The focused verifier covers both exact-once raw-plus-normal event handling and normal-event fallback. It remains physically unaccepted until the Samsung verdict.

For `rawlook1`, capture one moving sample near a building and one in an open area. Interpret the result as follows:

- **Preceding scene or simulation p95/worst rises with long gaps:** isolate that phase in the next single hypothesis card.
- **The LOOK gap p95 drops materially from about 82 ms and the phone is clearly smoother:** accept raw input delivery and keep this isolated change.
- **The LOOK gap p95 remains near 82 ms or the phone still clearly stutters:** reject this candidate; do not combine it with a renderer or frame-pacing change.
- **LOOK gaps stay normal but rendered-angle delta/jump or repeat counts rise:** test rendered-angle cadence next.
- **Preceding phases and LOOK metrics remain calm while stutter persists:** treat browser/display frame delivery as the leading hypothesis; do not add a cap without a separately testable candidate.

No renderer, resolution, HUD, or pacing behavior changes are included in this candidate.
