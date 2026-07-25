# S1-B — Compositing

The selected order is: far opaque wall, low side interval, horizontal cap, then sprites. Typed arrays store far depth, low depth, side interval, and cap interval for the current render width. No column object, source-image readback, canvas extraction, or renderer-buffer allocation occurs during a frame.

Transparent material is out of scope: the pilot uses diagnostic opaque faces so the geometry/depth question is isolated from artwork alpha.
