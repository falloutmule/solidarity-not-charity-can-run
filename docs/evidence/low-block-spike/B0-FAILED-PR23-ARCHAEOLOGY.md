# B1-A — Failed short-block history

Baseline: `ae0cba08b647ebff5db533f1dedff1b46f789412`. This is a read-only audit of preserved, closed PR #23 history on `origin/feature/building-toolkit-core`; no code from that branch is part of `main`.

| Candidate / commit | Path | Result | Retain / reject |
| --- | --- | --- | --- |
| `dumpstercutout1` / `78c210d` | Binary-alpha imported wall face | Source alpha and yellow-leak checks only; no device proof. | Reject as a full-height wall-cutout approach. |
| `dumpstercutout2` / `1189b0d` | Per-column `getImageData` alpha cutout in the wall loop | Browser checks passed, but physical-device evidence reported unusable performance. | Reject recurring readback; retain only the need for end-to-end compositing proof. |
| `dumpstercutout3` / `3a2e092` | Cached opaque spans | Avoided recurring readback but remained an alpha-cutout wall column, not a four-sided low block; no Android acceptance. | Reject. |
| `cd419f3` | Four-corner flat cap | Static polygon cap did not establish a true low-prism depth model. | Reject. |
| `1a3eced` | Wall-behind-short correction | Tried a second background wall and sprite clipping around one-column depth. | Retain the diagnosis that one scalar depth is insufficient; reject its implementation. |

Relevant final-history anchors: `src/js/game-16-section-7-render.js` (historical lines 34, 79–112, 170–244, 328–419, 460, 555) and `src/js/game-16a-bitmap-building-renderer.js` (historical lines 178–205, 247–283).

All earlier candidate IDs before `dumpstercutout1` retained `BUILD_ID=chromeinput2`, so they were not reliably identifiable on-device. A future visual candidate must have its own build identity.

Conclusion: preserve PR #23 as evidence. Do not reuse billboard, alpha-cutout wall, per-frame readback, cached-span, or static-cap runtime code.
