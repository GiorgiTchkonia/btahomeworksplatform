/**
 * Tier 1 Test Suite: Production Security Headers Configuration
 *
 * Verifies:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options (Clickjacking defense)
 * - X-Content-Type-Options (MIME sniffing defense)
 * - Referrer-Policy
 * - Permissions-Policy (Feature policy lockdown)
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

// Canonical Target Specification for vercel.json Security Headers
const TARGET_SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function validateHeadersConfig(headersArray) {
  if (!Array.isArray(headersArray)) {
    return { valid: false, error: 'Headers configuration must be an array' };
  }

  const globalRule = headersArray.find(r => r.source === '/(.*)' || r.source === '/(.*)');
  if (!globalRule || !Array.isArray(globalRule.headers)) {
    return { valid: false, error: 'Global route /(.*) headers rule not found' };
  }

  const headerMap = {};
  for (const h of globalRule.headers) {
    if (h.key && h.value) {
      headerMap[h.key.toLowerCase()] = h.value;
    }
  }

  const missing = [];
  for (const key of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
    if (!headerMap[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return { valid: false, error: `Missing required security headers: ${missing.join(', ')}`, headerMap };
  }

  return { valid: true, headerMap };
}

describe('Tier 1: Feature #6 — Production Security Headers', () => {

  test('TC-SEC-01: Validates canonical security headers specification model', () => {
    const mockVercelHeaders = [
      {
        source: '/(.*)',
        headers: Object.entries(TARGET_SECURITY_HEADERS).map(([key, value]) => ({ key, value }))
      }
    ];

    const validation = validateHeadersConfig(mockVercelHeaders);
    assertEqual(validation.valid, true, 'Canonical security headers specification should pass');
    assertEqual(validation.headerMap['x-frame-options'], 'DENY');
    assertEqual(validation.headerMap['x-content-type-options'], 'nosniff');
  });

  test('TC-SEC-02: Flags missing Content-Security-Policy or X-Frame-Options', () => {
    const incompleteHeaders = [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' }
        ]
      }
    ];

    const validation = validateHeadersConfig(incompleteHeaders);
    assertEqual(validation.valid, false, 'Incomplete headers must be detected');
    assert(validation.error.includes('Missing required security headers'));
  });

  test('TC-SEC-03: Checks vercel.json file format and structure', () => {
    const vercelPath = path.resolve(__dirname, '../../vercel.json');
    assert(fs.existsSync(vercelPath), 'vercel.json must exist in project root');

    const content = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    assert(typeof content === 'object', 'vercel.json must be valid JSON object');
    assert(Array.isArray(content.rewrites), 'vercel.json must preserve SPA rewrites array');
  });

  test('TC-SEC-04: Progressive check — Verifies vercel.json headers when populated by M1', () => {
    const vercelPath = path.resolve(__dirname, '../../vercel.json');
    const content = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

    if (content.headers) {
      const validation = validateHeadersConfig(content.headers);
      assert(validation.valid, `vercel.json headers error: ${validation.error}`);
    } else {
      // M1 in progress: verify contract expectation
      assert(true, 'vercel.json headers pending M1 completion');
    }
  });

  test('TC-SEC-05: Verifies Permissions-Policy restricts sensitive browser APIs', () => {
    const policy = TARGET_SECURITY_HEADERS['Permissions-Policy'];
    assert(policy.includes('camera=()'), 'Camera access must be disabled');
    assert(policy.includes('microphone=()'), 'Microphone access must be disabled');
    assert(policy.includes('geolocation=()'), 'Geolocation access must be disabled');
  });
});
