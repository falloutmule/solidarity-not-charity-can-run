# CARD 4 — Mobile viewport 100dvh P1

**BUILD_ID:** `dvh1`  
**Task:** t_f56da756 — visualViewport dvh hardening

## Changes

- `:root` CSS vars: `--app-vh` / `--app-vw` (`100dvh` / `100dvw`), pixel mirrors `--app-vh-px` / `--app-vw-px`, offsets `--vv-off-x` / `--vv-off-y`
- `html,body` use `var(--app-vh)` instead of legacy `height:100%` only
- Fixed shells (`#view`, `#mob`, `.rpan`, `#porthint`) track vv offset + pixel size
- `syncVisualViewportShell()` updates CSS vars from `visualViewport`; called from `resize()` and vv resize/scroll (immediate + debounced canvas relayout)
- `getViewportProof()` + `CR.syncVisualViewportShell` for device/debug checks
- `getDebugState().viewport` includes vv offsets and `--app-vh-px`

## Phone verify

1. `?mobile=on&v=dvh1` hard refresh
2. OPTIONS → `build dvh1`
3. Show/hide URL bar — bottom dock should not sit under chrome; canvas + `#mob` should not jump with a gap
4. Console: `CR.getViewportProof()` — `cssVars.appVhPx` should track `visual.h`

## Artifact

`index.html` in this workspace (copy to `HermesProjects/canned-run` for deploy)