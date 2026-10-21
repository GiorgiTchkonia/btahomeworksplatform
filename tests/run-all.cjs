#!/usr/bin/env node
/**
 * BTA Homeworks — Master Automated Test Runner
 *
 * Executes all 4 tiers of the testing track:
 * - Tier 1: Feature Coverage (URL, Files, RLS, Edge Function, Headers, Grading, Auth, etc.)
 * - Tier 2: Boundary & Corner Cases (URL boundaries, file boundaries, grade boundaries, deadlines, CSS patterns)
 * - Tier 3: Cross-Feature Combinations (RLS rules, storage lifecycle, route guards)
 * - Tier 4: Real-World Application Scenarios (Student, Teacher, Admin, Adversarial Attacks)
 *
 * Usage:
 *   node tests/run-all.cjs               # Run full test suite across all 4 tiers
 *   node tests/run-all.cjs --tier 1      # Run only Tier 1
 *   node tests/run-all.cjs --tier 2      # Run only Tier 2
 *   node tests/run-all.cjs --tier 3      # Run only Tier 3
 *   node tests/run-all.cjs --tier 4      # Run only Tier 4
 *   node tests/run-all.cjs --suite url   # Run only matching suites
 */

const fs = require('fs');
const path = require('path');
const { colors, runnerState } = require('./helpers/test-utils.cjs');

async function main() {
// Parse CLI Arguments
const args = process.argv.slice(2);
let targetTier = null;
let targetSuite = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier' && args[i + 1]) {
    targetTier = args[i + 1];
    i++;
  } else if (args[i] === '--suite' && args[i + 1]) {
    targetSuite = args[i + 1].toLowerCase();
    i++;
  }
}

console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}       BTA Homeworks — Automated Checks and Scenario Test Runner        ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);

const tiers = [
  { id: '1', name: 'Tier 1: Feature Coverage', dir: path.join(__dirname, 'tier1-features') },
  { id: '2', name: 'Tier 2: Boundary & Corner Cases', dir: path.join(__dirname, 'tier2-boundary') },
  { id: '3', name: 'Tier 3: Cross-Feature Combinations', dir: path.join(__dirname, 'tier3-cross-feature') },
  { id: '4', name: 'Tier 4: Real-World Scenarios', dir: path.join(__dirname, 'tier4-scenarios') },
];

const startTime = Date.now();
const tierSummaries = [];

for (const tier of tiers) {
  if (targetTier && targetTier !== tier.id) {
    continue;
  }

  console.log(`${colors.magenta}${colors.bold}▶ Executing ${tier.name}...${colors.reset}`);

  if (!fs.existsSync(tier.dir)) {
    console.log(`  ${colors.yellow}Directory not found: ${tier.dir}${colors.reset}\n`);
    continue;
  }

  const files = fs.readdirSync(tier.dir)
    .filter(f => f.endsWith('.test.cjs'))
    .sort();

  const tierStartSuitesCount = runnerState.suites.length;

  for (const file of files) {
    if (targetSuite && !file.toLowerCase().includes(targetSuite)) {
      continue;
    }

    const filePath = path.join(tier.dir, file);
    try {
      require(filePath);
    } catch (err) {
      console.error(`  ${colors.red}Error loading test file ${file}:${colors.reset}`, err);
      runnerState.failedTests++;
    }
  }

  await Promise.all(runnerState.pendingTests);
  const tierSuites = runnerState.suites.slice(tierStartSuitesCount);
  let tierPass = 0;
  let tierFail = 0;
  let tierSkip = 0;

  for (const s of tierSuites) {
    tierPass += s.passes;
    tierFail += s.fails;
    tierSkip += s.skips;

    const statusBadge = s.fails > 0
      ? `${colors.bgRed}${colors.white} FAIL ${colors.reset}`
      : `${colors.green} PASS ${colors.reset}`;

    console.log(`  ${statusBadge} ${s.name} ${colors.dim}(${s.passes} passed, ${s.durationMs}ms)${colors.reset}`);

    if (s.fails > 0) {
      for (const t of s.tests) {
        if (t.status === 'FAIL') {
          console.log(`    ${colors.red}✖ ${t.name}${colors.reset}`);
          if (t.error) {
            console.log(`      ${colors.dim}${t.error.message}${colors.reset}`);
          }
        }
      }
    }
  }

  tierSummaries.push({
    name: tier.name,
    suitesCount: tierSuites.length,
    passed: tierPass,
    failed: tierFail,
    skipped: tierSkip,
  });

  console.log('');
}

const totalDurationMs = Date.now() - startTime;
if (runnerState.totalTests === 0) {
  throw new Error('No tests matched. Check --tier and --suite filters.');
}

// Final Summary Report
console.log(`${colors.cyan}${colors.bold}----------------------------------------------------------------------${colors.reset}`);
console.log(`${colors.bold}Test Execution Summary Report:${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}----------------------------------------------------------------------${colors.reset}`);

console.log(`${'Tier Name'.padEnd(40)} | ${'Suites'.padEnd(8)} | ${'Passed'.padEnd(8)} | ${'Failed'.padEnd(8)}`);
console.log(`${'-'.repeat(40)}-+----------+----------+----------`);

for (const s of tierSummaries) {
  const failColor = s.failed > 0 ? colors.red : colors.green;
  console.log(
    `${s.name.padEnd(40)} | ${String(s.suitesCount).padEnd(8)} | ${String(s.passed).padEnd(8)} | ${failColor}${String(s.failed).padEnd(8)}${colors.reset}`
  );
}

console.log(`${'-'.repeat(40)}-+----------+----------+----------`);
console.log(
  `${colors.bold}${'Total'.padEnd(40)}${colors.reset} | ${String(runnerState.suites.length).padEnd(8)} | ${colors.green}${String(runnerState.passedTests).padEnd(8)}${colors.reset} | ${runnerState.failedTests > 0 ? colors.red : colors.green}${String(runnerState.failedTests).padEnd(8)}${colors.reset}`
);
console.log(`\nTime elapsed: ${(totalDurationMs / 1000).toFixed(2)}s`);

if (runnerState.failedTests > 0) {
  console.log(`\n${colors.bgRed}${colors.white}${colors.bold} TEST RUN FAILED: ${runnerState.failedTests} tests failed. ${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${colors.bgGreen}${colors.white}${colors.bold} ALL TESTS PASSED SUCCESSFULLY! (${runnerState.passedTests}/${runnerState.totalTests}) ${colors.reset}\n`);
  process.exit(0);
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
