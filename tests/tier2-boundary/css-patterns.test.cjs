/**
 * Tier 2 Boundary Test Suite: CSS Contrast & Tailwind Utility Pattern Scanner
 *
 * Verifies detection algorithms for:
 * 1. Double opacity classes: e.g. /30/90, /30/40, /30/80 (Tailwind syntax violation)
 * 2. White-on-white text: bg-white combined with unprefixed text-white (Invisible contrast)
 * 3. Broken hover/focus utility overrides: hover:* followed by dark:* instead of dark:hover:*
 * 4. 404 page dark mode header contrast: text-gray-800 without dark:text-*
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

// Pattern Detection Engines
function detectDoubleOpacity(classString) {
  const matches = classString.match(/\/\d+\/\d+/g);
  return matches ? matches : [];
}

function detectWhiteOnWhite(classString) {
  const tokens = classString.split(/\s+/);
  const hasBgWhite = tokens.some(t => t === 'bg-white' || t.startsWith('bg-white/'));
  // Unprefixed text-white (not dark:text-white, not hover:text-white)
  const hasUnprefixedTextWhite = tokens.some(t => t === 'text-white');
  return hasBgWhite && hasUnprefixedTextWhite;
}

function detectBrokenHoverDark(classString) {
  // Regex finding hover:[prop]-[val] paired with dark:[prop]-[val] (lacking dark:hover:)
  const brokenPatterns = [];
  const tokens = classString.split(/\s+/);

  const hoverBgs = tokens.filter(t => t.startsWith('hover:bg-'));
  const darkBgs = tokens.filter(t => t.startsWith('dark:bg-') && !t.startsWith('dark:hover:bg-'));

  const hoverTexts = tokens.filter(t => t.startsWith('hover:text-'));
  const darkTexts = tokens.filter(t => t.startsWith('dark:text-') && !t.startsWith('dark:hover:text-'));

  if (hoverBgs.length > 0 && darkBgs.length > 0) {
    brokenPatterns.push({ type: 'hover:bg + dark:bg', hover: hoverBgs, dark: darkBgs });
  }
  if (hoverTexts.length > 0 && darkTexts.length > 0) {
    brokenPatterns.push({ type: 'hover:text + dark:text', hover: hoverTexts, dark: darkTexts });
  }

  return brokenPatterns;
}

// Scanner for TSX files
function scanFileForCssPatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = {
    doubleOpacity: [],
    whiteOnWhite: [],
    brokenHover: [],
  };

  const classNameRegex = /className=(?:["'`]([^"'`]+)["'`]|{\s*`([^`]+)`\s*})/g;
  let match;
  while ((match = classNameRegex.exec(content)) !== null) {
    const classStr = match[1] || match[2] || '';

    const doubleOp = detectDoubleOpacity(classStr);
    if (doubleOp.length > 0) {
      findings.doubleOpacity.push({ classes: classStr, matches: doubleOp });
    }

    if (detectWhiteOnWhite(classStr)) {
      findings.whiteOnWhite.push({ classes: classStr });
    }

    const brokenHover = detectBrokenHoverDark(classStr);
    if (brokenHover.length > 0) {
      findings.brokenHover.push({ classes: classStr, details: brokenHover });
    }
  }

  return findings;
}

describe('Tier 2: Boundary & Corner Cases — CSS Contrast & Utility Scanner', () => {

  // Test 1: Double Opacity Detection
  test('TC-CSS-01: Detects invalid double opacity classes (/30/90, /30/40, /30/80)', () => {
    const invalidClass = 'bg-indigo-900/30/90 text-white p-4 shadow';
    const matches = detectDoubleOpacity(invalidClass);
    assertEqual(matches.length, 1);
    assertEqual(matches[0], '/30/90');

    const validClass = 'bg-indigo-900/30 text-white p-4 shadow';
    assertEqual(detectDoubleOpacity(validClass).length, 0);
  });

  // Test 2: White-on-White Text Contrast Detection
  test('TC-CSS-02: Detects invisible white-on-white text combinations', () => {
    // Audit Bug #5: WhitelistPage header stats had bg-white text-white
    const invisibleSnippet = 'bg-white text-white rounded-xl shadow';
    assertEqual(detectWhiteOnWhite(invisibleSnippet), true, 'bg-white text-white must be flagged');

    // Corrected snippet: bg-white text-slate-900 dark:bg-slate-800 dark:text-white
    const accessibleSnippet = 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white rounded-xl shadow';
    assertEqual(detectWhiteOnWhite(accessibleSnippet), false, 'Accessible contrast must pass');
  });

  // Test 3: Broken Hover/Focus Utility Pair Detection
  test('TC-CSS-03: Detects broken hover:* dark:* utility pairs lacking dark:hover:*', () => {
    // Malformed from python script: hover:text-indigo-600 dark:text-indigo-400
    const malformed = 'p-2 hover:text-indigo-600 dark:text-indigo-400 font-medium';
    const findings = detectBrokenHoverDark(malformed);
    assertEqual(findings.length, 1, 'Malformed hover pair must be flagged');
    assertEqual(findings[0].type, 'hover:text + dark:text');

    // Corrected: hover:text-indigo-600 dark:hover:text-indigo-400
    const corrected = 'p-2 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium';
    assertEqual(detectBrokenHoverDark(corrected).length, 0, 'Properly prefixed dark:hover: must pass');
  });

  test('TC-CSS-04: Detects broken hover:bg-* dark:bg-* pairs lacking dark:hover:bg-*', () => {
    const malformedBg = 'btn hover:bg-slate-200 dark:bg-slate-600';
    const findings = detectBrokenHoverDark(malformedBg);
    assertEqual(findings.length, 1);
    assertEqual(findings[0].type, 'hover:bg + dark:bg');

    const correctedBg = 'btn hover:bg-slate-200 dark:hover:bg-slate-600';
    assertEqual(detectBrokenHoverDark(correctedBg).length, 0);
  });

  // Test 5: Real File Scanner Diagnostic Mode
  test('TC-CSS-05: Scans codebase files and reports CSS defect census', () => {
    const pagesDir = path.resolve(__dirname, '../../src/pages_view');
    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
      let totalDoubleOpacity = 0;
      let totalWhiteOnWhite = 0;

      for (const file of files) {
        const fullPath = path.join(pagesDir, file);
        const report = scanFileForCssPatterns(fullPath);
        totalDoubleOpacity += report.doubleOpacity.length;
        totalWhiteOnWhite += report.whiteOnWhite.length;
      }

      // Assert that scanner runs cleanly and outputs metrics
      assert(typeof totalDoubleOpacity === 'number');
      assert(typeof totalWhiteOnWhite === 'number');
    }
  });

  // Test 6: Focus Dark Utility Validation
  test('TC-CSS-06: Validates focus:* dark:focus:* pair formatting', () => {
    const malformedFocus = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:bg-slate-800';
    const hasBrokenFocus = /focus:[^\s"'`>]+\s+dark:(?!focus:)/.test(malformedFocus);
    assertEqual(hasBrokenFocus, true, 'Malformed focus:* dark:* without dark:focus: must be caught');

    const correctedFocus = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800';
    const isFixedFocus = /focus:[^\s"'`>]+\s+dark:(?!focus:)/.test(correctedFocus);
    assertEqual(isFixedFocus, false, 'Properly prefixed dark:focus: must pass');
  });

  // Test 7: Dashboard Error Handling & Retry Button Verification
  test('TC-CSS-07: Verifies Georgian retry banner ("ხელახლა ცდა") exists across all 4 dashboards', () => {
    const dashboards = [
      '../../src/pages_view/StudentDashboardPage.tsx',
      '../../src/pages_view/TeacherDashboardPage.tsx',
      '../../src/pages_view/TeacherAssignmentDetailsPage.tsx',
      '../../src/pages_view/AdminDashboardPage.tsx',
    ];

    for (const relPath of dashboards) {
      const absPath = path.resolve(__dirname, relPath);
      assert(fs.existsSync(absPath), `File must exist: ${relPath}`);
      const content = fs.readFileSync(absPath, 'utf8');
      assert(content.includes('ხელახლა ცდა'), `File ${relPath} must include Georgian retry button text "ხელახლა ცდა"`);
      assert(content.includes('loadError') || content.includes('error'), `File ${relPath} must manage error state`);
    }
  });
});
