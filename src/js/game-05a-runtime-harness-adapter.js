// ---------------------------------------------------------------------------
// RUNTIME/HARNESS ADAPTER — inert production boundary
// ---------------------------------------------------------------------------
// The self-check artifact may replace these methods before its harness starts.
// Production must not acquire harness behavior through this boundary.
window.SNCHarnessAdapter = {
  isActive: () => false,
  allowFrame: () => true,
  suppressSave: () => false,
  suppressUnloadSave: () => false,
  muteAudio: () => false,
  forcePortrait: () => false,
  captureVisualSnapshot: () => null,
  captureSpriteGroundSnapshot: () => null,
};
