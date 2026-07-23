'use strict';
const fs = require('fs'); const path = require('path'); const { ROOT, loadDistrict01, exportToTiled } = require('./tiled-level-bridge');
function main(argv) { const [levelId] = argv; if (levelId !== 'district-01') throw new Error('only district-01 is supported'); const output = path.join(ROOT, 'authoring', 'levels', 'district-01', 'district-01.tmj'); fs.mkdirSync(path.dirname(output), { recursive: true }); const map = exportToTiled(loadDistrict01()); fs.writeFileSync(output, `${JSON.stringify(map, null, 2)}\n`, 'utf8'); process.stdout.write(`${JSON.stringify({ pass: true, levelId, output: path.relative(ROOT, output).replace(/\\/g, '/') })}\n`); }
try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
