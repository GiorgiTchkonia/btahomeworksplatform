/**
 * Test Utilities and Assertion Framework for BTA Homeworks E2E Test Suite
 * Native Node.js CommonJS runner with zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

// ANSI Color formatting
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Global Test Runner State
const runnerState = {
  currentSuite: null,
  suites: [],
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  startTime: 0,
  pendingTests: [],
};

function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: [],
    passes: 0,
    fails: 0,
    skips: 0,
    durationMs: 0,
  };
  runnerState.suites.push(suite);
  runnerState.currentSuite = suite;

  const start = Date.now();
  try {
    fn();
  } catch (err) {
    console.error(`${colors.red}Error executing suite "${suiteName}":${colors.reset}`, err);
    suite.fails++;
    runnerState.failedTests++;
  }
  suite.durationMs = Date.now() - start;
  runnerState.currentSuite = null;
}

function test(testName, fn, options = {}) {
  const suite = runnerState.currentSuite;
  if (!suite) {
    throw new Error('test() must be called inside describe()');
  }

  runnerState.totalTests++;

  if (options.skip) {
    suite.skips++;
    runnerState.skippedTests++;
    suite.tests.push({ name: testName, status: 'SKIP', error: null, durationMs: 0 });
    return;
  }

  const result = { name: testName, status: 'PENDING', error: null, durationMs: 0 };
  suite.tests.push(result);
  // Chain tests to preserve deterministic ordering and await every async assertion.
  const previous = runnerState.pendingTests.at(-1) || Promise.resolve();
  const pending = previous.then(async () => {
    const start = Date.now();
    try {
      await fn();
      suite.passes++;
      runnerState.passedTests++;
      result.status = 'PASS';
    } catch (error) {
      suite.fails++;
      runnerState.failedTests++;
      result.status = 'FAIL';
      result.error = error;
    } finally {
      result.durationMs = Date.now() - start;
      suite.durationMs += result.durationMs;
    }
  });
  runnerState.pendingTests.push(pending);
}

// Assertions
function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    const err = new Error(message);
    Error.captureStackTrace(err, assert);
    throw err;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    const err = new Error(msg);
    Error.captureStackTrace(err, assertEqual);
    throw err;
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    const msg = message || `Expected values not to equal ${JSON.stringify(expected)}`;
    const err = new Error(msg);
    Error.captureStackTrace(err, assertNotEqual);
    throw err;
  }
}

function assertDeepEqual(actual, expected, message) {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    const msg = message || `Deep equality failed:\nActual:   ${aStr}\nExpected: ${eStr}`;
    const err = new Error(msg);
    Error.captureStackTrace(err, assertDeepEqual);
    throw err;
  }
}

function assertThrows(fn, expectedRegexOrMessage, message) {
  let threw = false;
  let thrownError = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    thrownError = err;
  }
  if (!threw) {
    const msg = message || 'Expected function to throw an error, but it did not throw';
    const err = new Error(msg);
    Error.captureStackTrace(err, assertThrows);
    throw err;
  }
  if (expectedRegexOrMessage) {
    const errStr = thrownError ? (thrownError.message || String(thrownError)) : '';
    if (expectedRegexOrMessage instanceof RegExp) {
      if (!expectedRegexOrMessage.test(errStr)) {
        throw new Error(`Thrown error message "${errStr}" did not match regex ${expectedRegexOrMessage}`);
      }
    } else if (typeof expectedRegexOrMessage === 'string') {
      if (!errStr.includes(expectedRegexOrMessage)) {
        throw new Error(`Thrown error message "${errStr}" did not contain "${expectedRegexOrMessage}"`);
      }
    }
  }
}

function assertDoesNotThrow(fn, message) {
  try {
    fn();
  } catch (err) {
    const msg = message || `Expected function not to throw, but it threw: ${err.message}`;
    const newErr = new Error(msg);
    newErr.cause = err;
    Error.captureStackTrace(newErr, assertDoesNotThrow);
    throw newErr;
  }
}

function assertMatch(string, regex, message) {
  if (!regex.test(string)) {
    const msg = message || `Expected string "${string}" to match regex ${regex}`;
    const err = new Error(msg);
    Error.captureStackTrace(err, assertMatch);
    throw err;
  }
}

function assertIncludes(arrayOrString, item, message) {
  if (!arrayOrString.includes(item)) {
    const msg = message || `Expected ${JSON.stringify(arrayOrString)} to include ${JSON.stringify(item)}`;
    const err = new Error(msg);
    Error.captureStackTrace(err, assertIncludes);
    throw err;
  }
}

// =============================================================================
// Authoritative Domain Validators (Standard Implementation & Verification Logic)
// =============================================================================

/**
 * Validates Google Drive / Docs submission URLs according to R1 specification.
 * Stored XSS defense: Must be HTTPS and match exact hostnames.
 */
function isValidSubmissionUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (/[\r\n\t]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const allowedHosts = ['drive.google.com', 'docs.google.com'];
    return allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Strict MIME Type and Extension mappings for educational file uploads.
 */
const MIME_MAP = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  rar: ['application/x-rar-compressed', 'application/vnd.rar', 'application/octet-stream'],
};

const DANGEROUS_EXTENSIONS = [
  'exe', 'dll', 'bat', 'sh', 'js', 'mjs', 'cjs', 'php', 'py', 'vbs', 'msi', 'cmd', 'ps1', 'scr', 'com', 'pif'
];

/**
 * Validates file upload parameters (MIME, extension, size, allowed formats).
 */
function validateFileUpload(file, allowedFormats = [], maxSizeBytes = 15 * 1024 * 1024) {
  if (!file || !file.name) {
    return { valid: false, error: 'ფაილი არ არის მითითებული' };
  }

  // Extract extension
  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { valid: false, error: 'ფაილს არ აქვს გაფართოება' };
  }
  const ext = parts.pop().toLowerCase();

  // Check dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `ფაილის გაფართოება .${ext} დაუშვებელია და სახიფათოა` };
  }

  // Check MIME_MAP allowed extensions
  if (!MIME_MAP[ext]) {
    return { valid: false, error: `ფაილის ფორმატი .${ext} დაუშვებელია` };
  }

  // Teacher allowed formats constraint
  if (allowedFormats && allowedFormats.length > 0) {
    const normalizedAllowed = allowedFormats.map(f => f.replace(/^\./, '').toLowerCase());
    if (!normalizedAllowed.includes(ext)) {
      return { valid: false, error: `მასწავლებელი ითხოვს შემდეგ ფორმატებს: ${allowedFormats.join(', ')}` };
    }
  }

  // MIME check if provided
  if (file.type) {
    const validMimes = MIME_MAP[ext];
    if (validMimes && !validMimes.includes(file.type.toLowerCase())) {
      return { valid: false, error: `არასწორი MIME ტიპი: ${file.type} გაფართოებისთვის .${ext}` };
    }
  }

  // Size limit
  if (file.size && file.size > maxSizeBytes) {
    return { valid: false, error: `ფაილის ზომა აღემატება ლიმიტს (${Math.round(maxSizeBytes / (1024 * 1024))}MB)` };
  }

  return { valid: true, ext };
}

/**
 * Generates secure storage path segregating by student ID.
 */
function generateStoragePath(studentId, fileExt, uuid) {
  if (!studentId || typeof studentId !== 'string') {
    throw new Error('Student ID is required for storage path segregation');
  }
  const cleanExt = (fileExt || 'bin').replace(/^\./, '').toLowerCase();
  const fileId = uuid || 'mock-uuid-1234';
  return `${studentId}/${fileId}.${cleanExt}`;
}

/**
 * Validates teacher grading score (1-10 integer, optional/nullable).
 */
function validateGrade(grade) {
  if (grade === null || grade === undefined || grade === '') {
    return { valid: true, value: null };
  }
  const num = Number(grade);
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'შეფასება უნდა იყოს მთელი რიცხვი' };
  }
  if (num < 1 || num > 10) {
    return { valid: false, error: 'შეფასება უნდა იყოს 1-დან 10-მდე' };
  }
  return { valid: true, value: num };
}

module.exports = {
  colors,
  runnerState,
  describe,
  test,
  assert,
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertThrows,
  assertDoesNotThrow,
  assertMatch,
  assertIncludes,
  isValidSubmissionUrl,
  validateFileUpload,
  generateStoragePath,
  validateGrade,
  MIME_MAP,
  DANGEROUS_EXTENSIONS,
};
