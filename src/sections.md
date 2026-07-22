# Target module map ↔ index.html SECTION markers

| Target module | SECTION in index.html |
|---------------|---------------------|
| CONFIG | 2 GAME STATE + cfg, 0c DEBUG |
| DOM / VIEWPORT | 0 CANVAS, 0b FULLSCREEN, visualViewport shell |
| OPTIONS / STORAGE | 5b LOCAL PERSISTENCE, options object |
| INPUT | 11 UPDATE + INPUT, keyboard |
| MOBILE LAYOUT | 2b MOBILE / TOUCH, portraitLayout, #mob |
| LEVEL GENERATION | 3 CITY GENERATION |
| CUSTOM LEVELS | 3b CUSTOM LEVELS |
| COLLISION | 4 COLLISION |
| AUDIO | 5 AUDIO |
| PROCEDURAL ASSETS | 6 PROCEDURAL ASSETS |
| RENDER | 7 RENDER |
| MINIMAP | 8 MINIMAP |
| HUD / STATS | 9 HUD + RETICLE + POPUPS |
| GAMEPLAY ACTIONS | 10 GAMEPLAY ACTIONS |
| UPDATE LOOP | 11 UPDATE + INPUT, 13 MAIN LOOP |
| MENUS | 2c RESPONSIVE MOBILE MENU, overlays |
| DEBUG / CR SELF-CHECKS | CR.run*SelfCheck, harness hooks in script tail |
| TEST HARNESS HOOKS | crWithTemporaryState, benchmark scenes, __crRuntimeErrors |

Search pattern in `index.html`: `// SECTION` or `// ---------------------------------------------------------------------------`