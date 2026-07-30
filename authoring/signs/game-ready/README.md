# World 1 sign sources

`masters/` contains the unmodified PNGs from `game_ready_signs.zip` and is the
source authority. `runtime/` contains deterministic cropped runtime copies.
`tools/build-runtime-sign-assets.py` removes only fully transparent outer
padding, normalizes RGB beneath alpha zero, preserves the source aspect ratio,
and writes the self-contained runtime registry. The game always samples these
billboards with nearest-neighbor filtering.
