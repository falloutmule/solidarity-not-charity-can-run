# Touch-action policy audit (Card 9) — BUILD_ID touch1

## Policy (documented in index.html CSS)

| Surface | touch-action | Rationale |
|---------|--------------|-----------|
| html, body | none | No page scroll / pinch zoom during play |
| #view (canvas) | none | Gameplay render surface |
| #mob, .mbtn, #ml, #mlookpad, #mr, #mportmenu | none | Joystick, look, action buttons — custom handlers |
| .rpan (menus) | none | Default menu panels (tap-to-select) |
| .rpan.options-tune | pan-y | OPTIONS tuning rows scroll on phone |
| .rit (menu rows) | none | Tap targets inside scrollable OPTIONS |

Viewport: `maximum-scale=1,user-scalable=no` + `overscroll-behavior:none` on body.

## Event listeners (gameplay)

- Joystick (#ml): pointerdown/move/up/cancel + touchstart/move/end/cancel, `{passive:false}` + preventDefault on move.
- Look (#mlookpad): touch + pointer paths; touchcancel clears lookTouch.
- Landscape look (#mr / tzone): document touchmove routes tzone; **document touchcancel** added to clear joy/tzone/lookTouch (parity with touchend).
- Buttons: touchcancel on mg/ms/mm/mp/mportmenu clears held state.
- rmenu: touchstart/touchend with dy>28px scroll guard; touchcancel clears pending action.

## Verification

Load `index.html?v=touch1&mobile=on` and in console:

```js
CR.getTouchActionProof()
```

Expect: `gameplaySurfacesNone: true`, `bodyTouchAction: "none"`, OPTIONS open → `rmenuExpected: "pan-y"`.

## Files

- `index.html` — policy comment, #mr/#mportmenu touch-action, document touchcancel, `getTouchActionProof()`, BUILD_ID `touch1`
- `index.before-touch-action-card9.html` — backup