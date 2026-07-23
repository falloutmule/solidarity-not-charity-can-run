"use strict";
/* ============================================================================
   AI-SAFE SINGLE-FILE CONSTITUTION (Kanban CARD 11 — P1 comment block headers)
   ============================================================================
   HERMES / AI EDIT RULES (mandatory):
   1) Named section edits only — change code only inside labeled SECTION blocks.
   2) Save schema changes require SAVE_VERSION bump and migration.
   3) One-way data flow: INPUT → ACTIONS → SIMULATION → RENDER.
   4) Render code must not mutate gameplay state.
   5) Scene transitions own setup/teardown (timers, listeners, overlays).
   6) Feature flags live only in CONFIG / DEBUG / options / URL query params.
   7) No runtime external dependencies (no CDN scripts, fonts, or APIs).
   8) No eval().
   9) No inline event handlers (no onclick= in HTML).
  10) Production diagnostics are read-only via window.SNCDiagnostics; the
      mutable window.CR API exists only in the run-local self-check artifact.
  11) One Kanban card at a time.
  12) Every edit must pass the Playwright harness (tests/run_selfcheck_playwright.js).
  13) Harness scenes must be temporary and state-isolated (no benchmark leak).
  14) Public release artifact must remain a single-file HTML game.
  15) Do not ask Travis to discover bugs the harness can test.

   Portrait dock (Card 5): controlsYOffsetPx moves MOVE/GIVE/SPRINT/LOOK only; MENU fixed.

   FILE: Solidarity Not Charity Can Run — single-file raycaster roguelike (no deps).
   SOURCE POLICY: see SOURCE_RELEASE_POLICY.md; optional src/ scaffold; ship index.html.

   SECTION INDEX:
     0   CANVAS / RESOLUTION (+ zbuffer occlusion guard)
     0b  FULLSCREEN API
     0c  DEBUG FLAG
     1   SEEDED RNG
     2   GAME STATE + cfg
     2b  MOBILE / TOUCH INPUT
     2c  RESPONSIVE MOBILE MENU
     3   CITY GENERATION
     3b  CUSTOM LEVELS
     4   COLLISION
     5   AUDIO (WebAudio + centralized AudioContext unlock gate)
     5b  LOCAL PERSISTENCE (SAVE_VERSION)
     6   PROCEDURAL ASSETS
     7   RENDER
     8   MINIMAP
     9   HUD + RETICLE + POPUPS
    10   GAMEPLAY ACTIONS
    11   UPDATE + INPUT
    12   OVERLAYS
    13   MAIN LOOP + BOOT (production diagnostics / test-harness boundary)

   DEBUG: ?debug ?layoutdebug=1 ?touchdebug=1 ?mobile=on
   ========================================================================== */

// Lightweight runtime error capture for verification/debugging; empty in normal play.
window.__crRuntimeErrors = [];
window.addEventListener('error', e=>{
  window.__crRuntimeErrors.push({message:e.message||'', line:e.lineno||0, col:e.colno||0, source:e.filename||'', stack:e.error&&e.error.stack?String(e.error.stack):''});
});
window.addEventListener('unhandledrejection', e=>{
  window.__crRuntimeErrors.push({message:'unhandledrejection', reason:String(e.reason||'')});
});

