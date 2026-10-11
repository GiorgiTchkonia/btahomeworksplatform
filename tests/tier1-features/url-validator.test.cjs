/**
 * Tier 1 Test Suite: Submission URL Validation & Stored XSS Rejection
 *
 * Verifies that submission URLs strictly conform to:
 * - HTTPS protocol
 * - Exact hostname whitelist: drive.google.com and docs.google.com
 * - Complete rejection of XSS vectors (javascript:, data:, vbscript:, malformed, etc.)
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  isValidSubmissionUrl,
} = require('../helpers/test-utils.cjs');

describe('Tier 1: Feature #5 — Submission URL Validator & Stored XSS Elimination', () => {

  // Happy Path: Legitimate Google Drive & Docs links
  test('TC-URL-01: Accepts valid Google Drive file share link', () => {
    const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing';
    assertEqual(isValidSubmissionUrl(url), true, 'Valid Google Drive file link should be accepted');
  });

  test('TC-URL-02: Accepts valid Google Docs document link', () => {
    const url = 'https://docs.google.com/document/d/1wX5iV_4mP_9qL0eK2_a98/edit?usp=drivesdk';
    assertEqual(isValidSubmissionUrl(url), true, 'Valid Google Docs document link should be accepted');
  });

  test('TC-URL-03: Accepts valid Google Sheets spreadsheet link', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1pQl_abcd1234567890/edit#gid=0';
    assertEqual(isValidSubmissionUrl(url), true, 'Valid Google Sheets link should be accepted');
  });

  test('TC-URL-04: Accepts valid Google Slides presentation link', () => {
    const url = 'https://docs.google.com/presentation/d/1eRfG_9988776655/edit?usp=sharing';
    assertEqual(isValidSubmissionUrl(url), true, 'Valid Google Presentation link should be accepted');
  });

  test('TC-URL-05: Accepts valid Google Drive folder link', () => {
    const url = 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ';
    assertEqual(isValidSubmissionUrl(url), true, 'Valid Google Drive folder link should be accepted');
  });

  // Stored XSS Prevention vectors
  test('TC-URL-06: Rejects javascript: protocol with pseudo-domain (Stored XSS vector from audit)', () => {
    const payload = 'javascript:alert(document.cookie)//drive.google.com';
    assertEqual(isValidSubmissionUrl(payload), false, 'Stored XSS javascript: payload must be rejected');
  });

  test('TC-URL-07: Rejects javascript: protocol with simple alert payload', () => {
    const payload = 'javascript:alert(1)';
    assertEqual(isValidSubmissionUrl(payload), false, 'javascript:alert(1) must be rejected');
  });

  test('TC-URL-08: Rejects data: URI payload', () => {
    const payload = 'data:text/html,<script>alert(window.origin)</script>';
    assertEqual(isValidSubmissionUrl(payload), false, 'data: URI must be rejected');
  });

  test('TC-URL-09: Rejects vbscript: protocol payload', () => {
    const payload = 'vbscript:msgbox("pwned")';
    assertEqual(isValidSubmissionUrl(payload), false, 'vbscript: payload must be rejected');
  });

  // Protocol Enforcement (Insecure HTTP & others)
  test('TC-URL-10: Rejects insecure HTTP Google Drive link', () => {
    const url = 'http://drive.google.com/file/d/12345/view';
    assertEqual(isValidSubmissionUrl(url), false, 'Insecure HTTP link must be rejected');
  });

  test('TC-URL-11: Rejects FTP protocol link', () => {
    const url = 'ftp://drive.google.com/files/homework.pdf';
    assertEqual(isValidSubmissionUrl(url), false, 'FTP protocol must be rejected');
  });

  // Domain & Subdomain Spoofing
  test('TC-URL-12: Rejects domain spoofing attacker suffix (drive.google.com.attacker.com)', () => {
    const url = 'https://drive.google.com.attacker.com/steal-creds';
    assertEqual(isValidSubmissionUrl(url), false, 'Domain spoofing via suffix must be rejected');
  });

  test('TC-URL-13: Rejects attacker prefix subdomain (attacker-drive.google.com)', () => {
    const url = 'https://attacker-drive.google.com/file';
    assertEqual(isValidSubmissionUrl(url), false, 'Attacker prefix subdomain must be rejected');
  });

  test('TC-URL-14: Rejects unauthorized third-party file sharing services (dropbox, onedrive)', () => {
    const dropbox = 'https://www.dropbox.com/s/12345/homework.docx';
    const onedrive = 'https://onedrive.live.com/?id=root&cid=1234';
    assertEqual(isValidSubmissionUrl(dropbox), false, 'Dropbox links must be rejected');
    assertEqual(isValidSubmissionUrl(onedrive), false, 'OneDrive links must be rejected');
  });

  // Edge cases & malformed strings
  test('TC-URL-15: Rejects empty string, whitespace, null, and non-string inputs', () => {
    assertEqual(isValidSubmissionUrl(''), false, 'Empty string must be rejected');
    assertEqual(isValidSubmissionUrl('   '), false, 'Whitespace must be rejected');
    assertEqual(isValidSubmissionUrl(null), false, 'null must be rejected');
    assertEqual(isValidSubmissionUrl(undefined), false, 'undefined must be rejected');
    assertEqual(isValidSubmissionUrl(12345), false, 'Number must be rejected');
    assertEqual(isValidSubmissionUrl({}), false, 'Object must be rejected');
  });

  test('TC-URL-16: Handles leading/trailing whitespace gracefully for legitimate URLs', () => {
    const urlWithSpaces = '  https://drive.google.com/file/d/12345/view  ';
    assertEqual(isValidSubmissionUrl(urlWithSpaces), true, 'Trimmable valid URL should be accepted');
  });
});
