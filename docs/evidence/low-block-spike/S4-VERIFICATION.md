# S4 — Automated verification

Passed: focused low-block browser smoke, normal production browser smoke, render interpolation, far-field angle, far-field resolution, Chrome Pointer-path owner test, concurrent MOVE + LOOK smoke, `custom_next_001` contract, bitmap renderer check, authored D1, authored D1 save, metadata truth, build, build parity, and `git diff --check`.

The focused low-block smoke verifies: query isolation, `lowblockspike1`, `heightScale: 0.4`, one block, low side/cap/sprite-clip columns, under-64-KB buffers, no readback, normal collision, and no browser errors or external requests.

Not yet verified: Android Chrome appearance/performance, immutable public preview, final dumpster art, and under-10% device frame-cost evidence.
