const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { describe, test } = require('../helpers/test-utils.cjs');

describe('Test runner regressions', () => {
  test('An assertion after await is recorded as failure', () => {
    const helper = path.join(__dirname, '../helpers/test-utils.cjs');
    const child = spawnSync(process.execPath, ['-e', `
      const { describe, test, runnerState } = require(${JSON.stringify(helper)});
      describe('async probe', () => {
        test('delayed rejection', async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('expected async failure');
        });
      });
      Promise.all(runnerState.pendingTests).then(() => {
        process.stdout.write(JSON.stringify({ passed: runnerState.passedTests, failed: runnerState.failedTests }));
        process.exitCode = runnerState.failedTests ? 1 : 0;
      });
    `], { encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.deepEqual(JSON.parse(child.stdout), { passed: 0, failed: 1 });
  });
  test('An unmatched suite filter does not report a successful run', () => {
    const runner = path.join(__dirname, '../run-all.cjs');
    const child = spawnSync(process.execPath, [runner, '--suite', 'does-not-exist'], { encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /No tests matched/);
  });
});
