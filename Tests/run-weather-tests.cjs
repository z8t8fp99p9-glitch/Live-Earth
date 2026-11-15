#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const tests = [
  'weather-scene-runtime.test.cjs',
  'weather-background-lifecycle.test.cjs',
  'weather-responsive-preview-mode.test.cjs',
  'weather-current-contract.test.cjs',
  'weather-legacy-art-hook.test.cjs'
];

let failures = 0;
for (const file of tests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (result.error) {
    failures++;
    process.stderr.write(`${file}: ${result.error.message}\n`);
  } else if (result.status !== 0) {
    failures++;
    process.stderr.write(`${file}: exited with status ${result.status}\n`);
  }
}

if (failures) {
  process.stderr.write(`Weather regression suite failed: ${failures}/${tests.length} test files.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Weather regression suite passed: ${tests.length}/${tests.length} test files.\n`);
}
