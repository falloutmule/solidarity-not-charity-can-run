# P7 render-profile selection synthesis

Baseline: `33f47a0`, `chromeinput2`, production artifact SHA-256
`623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e`.

## Selected seam

Render-profile selection is an L1 literal relocation. It owns canonical profile
data, URL-only `ffres` selection, selected-profile state, and canonical-profile
lookup. Render-target allocation, canvas mutation, and render-profile application
remain in `game-01a-render-resolution-profiles.js`.

## Ownership and reachability

The selected symbols are used by the retained render-target owner, the main-loop
startup hook, and perf diagnostics. They have no storage, audio, gameplay, input,
or HTML-menu writes. Existing `test:farfield-resolution` covers both profile
selection and retained target allocation.

## Implementation

Move the exact leading block into
`src/js/game-01aa-render-profile-selection.js`, immediately before its former
owner in the ordered manifest. Preserve lexical names and source order. Update
the focused verifier to execute the adjacent pair as one runtime source.

## Artifact class and tests

B1 exact identity is required. Run the static boundary test,
`test:farfield-resolution`, the ordinary production smoke, interpolation and
far-field-angle tests, build, build check, and diff check.
