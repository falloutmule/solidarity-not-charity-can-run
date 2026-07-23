'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'tools', 'capture-docs-images.js'), 'utf8');

assert(source.includes('window.SNCDiagnostics'), 'documentation capture must wait on the bounded production diagnostics');
assert(source.includes("[data-action=\"title-start\"]"), 'documentation capture must start a normal run through the title control');
assert(!source.includes('window.CR'), 'documentation capture must not require the retired mutable API');
assert(!source.includes('CR.startRun'), 'documentation capture must not start runs through a harness-only action');

console.log(JSON.stringify({ check:'docs-capture-production-boundary', pass:true }));
