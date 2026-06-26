# Mobile layout and controls

## Frozen layout

- Portrait shell is **frozen** from **layoutguard2** (`16b9294` era).
- Do **not** redesign FPV / minimap / control dock placement unless a harness fails or Travis explicitly requests a change.

## Control reliability

- **BUILD_ID `controlrel1`** — mobile control reliability guard shipped.
- Harness covers: MOVE/LOOK release, thumb drift, SPRINT, GIVE, MENU, pause/menu disconnect, input cleanup after harness.

## Minimap

- **Minimap overlap guard** exists in layout self-checks (`crMinimapOverlapPass`).

## Reset controls

- URL **`resetcontrols=1`** restores safe **MID** control offsets when testing on device.

## Overlap clamps

- **VERY HIGH** Y-offset clamps apply when overlap is detected (harness-driven safe dock).

## Testing

- Playwright: `proof-mobile-control-reliability.json`, portrait sections in `tests/run_selfcheck_playwright.js`.
- Real-phone issues still matter for **feel**; harness proves logic and layout contracts on emulated viewport.

See **`../reports/guards/MOBILE_CONTROL_RELIABILITY_REPORT.md`** and **`../reports/guards/PORTRAIT_LAYOUT_USABILITY_REPORT.md`**.