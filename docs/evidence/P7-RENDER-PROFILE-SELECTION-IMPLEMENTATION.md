# P7 render-profile selection implementation

## Classification

L1 literal relocation with B1 exact artifact identity.

## Responsibility moved

`game-01aa-render-profile-selection.js` now owns canonical 320/400/480 profile
data, URL selection, selected-profile state, canonicalization, and profile
lookup. The adjacent `game-01a` module retains render-target matching, target
allocation, resolution statistics, and profile application.

## Protected systems

No Pointer input, timing, renderer dispatch, persistence, audio, authored
content, or mobile layout source changed. The generated production artifact is
byte-identical to its baseline.

## Focused verification

- `test:render-profile-selection-boundary` passed;
- `test:farfield-resolution` passed;
- normal production smoke passed;
- interpolation and far-field-angle tests passed;
- build, build check, and diff check passed.

## Artifact identity

```text
BUILD_ID  chromeinput2
bytes     918383
SHA-256   623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e
Git blob  9133eabb6cf8503a1fb5d0e4b6a3625c992789c7
```
