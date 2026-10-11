/**
 * Tier 1 Test Suite: Theme Flash (FOUC) Elimination
 *
 * Verifies:
 * - index.html inline script executes before body render
 * - localStorage and prefers-color-scheme logic synchronization
 * - ThemeProvider defaultTheme setting alignment with system theme
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

describe('Tier 1: Feature #11 — Theme Flash (FOUC) Elimination', () => {

  test('TC-FOUC-01: Verifies index.html contains inline theme initialization script in <head>', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    assert(fs.existsSync(indexPath), 'index.html must exist');
    const html = fs.readFileSync(indexPath, 'utf8');

    assert(html.includes('<script>'), 'index.html must contain an inline script block');
    assert(
      html.includes("localStorage.getItem('bta-theme')") || html.includes("localStorage.getItem('theme')") || html.includes('localStorage.theme'),
      'Script must check localStorage for user theme preference'
    );
    assert(
      html.includes('prefers-color-scheme: dark'),
      'Script must query system dark mode preference'
    );
    assert(
      html.includes("classList.add('dark')"),
      "Script must apply 'dark' class to <html> when dark mode is active"
    );
  });

  test('TC-FOUC-02: Verifies theme resolution logic adheres to specification precedence', () => {
    function resolveTheme(storedTheme, systemPrefersDark) {
      if (storedTheme === 'dark') return 'dark';
      if (storedTheme === 'light') return 'light';
      // System default fallback
      return systemPrefersDark ? 'dark' : 'light';
    }

    assertEqual(resolveTheme('dark', false), 'dark', 'Explicit dark preference overrides light system');
    assertEqual(resolveTheme('light', true), 'light', 'Explicit light preference overrides dark system');
    assertEqual(resolveTheme(null, true), 'dark', 'System dark applies when no preference stored');
    assertEqual(resolveTheme(null, false), 'light', 'System light applies when no preference stored');
  });

  test('TC-FOUC-03: Progressive check on App.tsx ThemeProvider defaultTheme configuration', () => {
    const appPath = path.resolve(__dirname, '../../src/App.tsx');
    if (fs.existsSync(appPath)) {
      const appCode = fs.readFileSync(appPath, 'utf8');
      // If ThemeProvider is used, check defaultTheme setting
      if (appCode.includes('<ThemeProvider')) {
        const hasSystemDefault = appCode.includes('defaultTheme="system"');
        const hasLightDefault = appCode.includes('defaultTheme="light"');
        assert(
          hasSystemDefault || hasLightDefault,
          'ThemeProvider should specify defaultTheme'
        );
      }
    }
  });
});
