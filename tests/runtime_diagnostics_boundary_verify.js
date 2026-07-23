const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'build-manifest.json'), 'utf8'));
const mainLoopPath = 'src/js/game-22-section-13-main-loop.js';
const diagnosticsPath = 'src/js/game-22a-runtime-diagnostics.js';
const mainLoop = fs.readFileSync(path.join(root, mainLoopPath), 'utf8');
const diagnostics = fs.readFileSync(path.join(root, diagnosticsPath), 'utf8');
const artifact = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mainLoopIndex = manifest.scripts.indexOf(mainLoopPath);
const diagnosticsIndex = manifest.scripts.indexOf(diagnosticsPath);
assert(mainLoopIndex >= 0, 'main-loop manifest input is missing');
assert(diagnosticsIndex === mainLoopIndex + 1, 'runtime diagnostics must immediately follow the main loop');
assert(diagnosticsIndex === manifest.scripts.length - 1, 'runtime diagnostics must remain the terminal script input');
assert(!mainLoop.includes('function getDebugState(){'), 'main loop still owns getDebugState');
assert(!mainLoop.includes('window.SNCDiagnostics = Object.freeze'), 'main loop still owns SNCDiagnostics');
assert(diagnostics.includes('function getDebugState(){'), 'runtime diagnostics does not own getDebugState');
assert(diagnostics.includes('window.SNCDiagnostics = Object.freeze'), 'runtime diagnostics does not expose SNCDiagnostics');
assert(diagnostics.includes('crGetFixedStepState()'), 'runtime diagnostics no longer reads fixed-step state');
assert(diagnostics.includes('crPerfProbeGetReport()'), 'runtime diagnostics no longer reads performance state');
assert((artifact.match(/function getDebugState\(\)\{/g) || []).length === 1, 'artifact must contain one getDebugState definition');
assert((artifact.match(/window\.SNCDiagnostics = Object\.freeze/g) || []).length === 1, 'artifact must contain one SNCDiagnostics definition');
console.log('PASS runtime diagnostics boundary');
