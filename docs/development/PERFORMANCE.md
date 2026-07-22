# Mobile Performance

## Current decision

Production uses the 400x250 internal render profile with interpolated angles and subpixel projection. The 320x200 comparison was not smoother and looked worse, so neither it nor adaptive resolution is a current path.

Measured simulation, scene, HUD, mobile UI, and bitmap work did not saturate the frame budget on the supplied stuttering captures. The earlier evidence pointed to input delivery rather than continuous renderer overload. The rejected `rawlook1` experiment did not improve Android Chrome and does not close the issue because `pointerrawupdate` has no uncoalesced-rate guarantee.

## Chrome pointer-path acceptance

`chromeinput2` is the accepted Android Chrome input card. On PointerEvent-capable browsers it installs the Pointer route only, keeps legacy Touch handlers as a no-PointerEvent fallback, uses element-level ownership and pointer capture, and consumes `getCoalescedEvents()` samples without double counting.

Static interaction CSS disables native touch handling before contact on the game surface and controls. During the physical Android Chrome comparison, simultaneous MOVE + LOOK was **clearly better** than `inputfallback1` near buildings and in open space. Both thumbs remained responsive; there was no page scroll, pull-to-refresh, text selection, zoom gesture, or material sensitivity change.

This is a scoped acceptance of the Chrome input path, not proof that every future mobile-performance concern is closed. Do not return to renderer, resolution, raw-pointer, or frame-cap experiments without new evidence.

## Diagnostics and retained guardrails

The query-gated `?perfprobe=1` overlay and its `CR.crPerfProbeGetReport().longFrame` report remain available for future bounded investigation. The broad historical self-check is characterization only.

Future mobile changes must preserve the accepted Pointer-only Chrome route, coalesced-sample exact-once handling, static `touch-action: none`, no-scroll interaction surface, 400x250 profile, fixed-step simulation, and render interpolation unless a new card explicitly tests a different hypothesis.
