# Self-check run log (compact)

| build | commit | device/browser | test | expected | actual | verdict | evidence |
|-------|--------|----------------|------|----------|--------|---------|----------|
| selfharness1 | (pending push) | Chromium local 390x844 | CR.runFullSelfCheck | pass true | pass true | PASS | proof-full-selfcheck.json |
| selfharness1 | (pending push) | Chromium local | constitution | markers + no eval/onclick/external | all checks true | PASS | proof-constitution-check.json |
| selfharness1 | (pending push) | Chromium local | network guard | 0 external requests | 0 external | PASS | proof-network.json |
| selfharness1 | (pending push) | Chromium local | console/page errors | none | none | PASS | proof-playwright-summary.json |
| selfharness1 | (pending push) | Pixel 7 portrait 412x915 | layout | runLayoutSelfCheck pass | pass | PASS | proof-playwright-pixel7-portrait.png |
| selfharness1 | (pending push) | Pixel 7 landscape | layout | pass | pass | PASS | proof-playwright-pixel7-landscape.png |
| selfharness1 | (pending push) | Travis-like 360x800 | layout | pass | pass | PASS | proof-playwright-travislike-portrait.png |
| selfharness1 | (pending push) | Desktop 1280x720 smoke | layout | pass | PASS | proof-playwright-desktop-smoke.png |
| selfharness1 | (pending push) | Chromium local | control dock height | controls move, MENU fixed | moveDelta 120, menuDelta 0 | PASS | proof-control-dock-playwright.json |
| selfharness1 | (pending push) | Chromium local | pointer torture | joy/look release clean | all checks true | PASS | proof-pointer-torture.json |
| selfharness1 | (pending push) | Chromium local | viewport resilience | layout at 844/720/932 | all pass | PASS | proof-viewport-resilience.json |
| selfharness1 | (pending push) | Chromium local | save/load roundtrip | x survives reload | pass loaded x=1.85 | PASS | proof-save-load-roundtrip.json |
| selfharness1 | (pending push) | Chromium local | audio unlock | beep + no lastError | pass | PASS | proof-audio-unlock.json |
| selfharness1 | (pending push) | Chromium local | visual regression index | canvas non-blank | pass | PASS | proof-visual-regression-index.json |
| selfharness1 | (pending push) | Chromium local | selfcheck URL | overlay + __crSelfCheckResult | pass overlay | PASS | proof-playwright-summary.json selfcheckUrl |