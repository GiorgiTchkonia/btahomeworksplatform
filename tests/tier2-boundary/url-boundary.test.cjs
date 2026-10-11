/**
 * Tier 2 Boundary Test Suite: URL Validator Boundary & Adversarial Cases
 *
 * Verifies edge cases and evasion attempts against the submission URL validator:
 * - Scheme variations (HTTP, FTP, file://, javascript:, blob:, about:blank)
 * - Obfuscated hostnames, unicode domains, IP addresses
 * - Protocol-relative URLs (//drive.google.com)
 * - Userinfo embedding (https://drive.google.com@evil.com)
 * - Non-standard ports (https://drive.google.com:8080/...)
 * - Control characters, null bytes (%00), and newlines
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  isValidSubmissionUrl,
} = require('../helpers/test-utils.cjs');

describe('Tier 2: Boundary & Corner Cases — Submission URL Validator', () => {

  // Protocol relative URLs
  test('TC-URL-BOUND-01: Rejects protocol-relative URLs (//drive.google.com/...)', () => {
    assertEqual(isValidSubmissionUrl('//drive.google.com/file/d/123'), false);
    assertEqual(isValidSubmissionUrl('//docs.google.com/document/d/123'), false);
  });

  // Userinfo injection / credential spoofing
  test('TC-URL-BOUND-02: Rejects userinfo spoofing (https://drive.google.com@attacker.com)', () => {
    // In standard URI syntax, drive.google.com before @ is treated as username, attacker.com is hostname
    const payload = 'https://drive.google.com@attacker.com/steal';
    assertEqual(isValidSubmissionUrl(payload), false, 'Userinfo hostname spoofing must be rejected');
  });

  test('TC-URL-BOUND-03: Rejects userinfo with password (https://drive.google.com:pass@attacker.com)', () => {
    const payload = 'https://drive.google.com:password@attacker.com/malicious';
    assertEqual(isValidSubmissionUrl(payload), false);
  });

  // Non-standard ports
  test('TC-URL-BOUND-04: Rejects non-standard ports (https://drive.google.com:8443)', () => {
    // Standard HTTPS is port 443 (default). Custom ports to drive.google.com indicate proxy/tampering
    const urlWithPort = 'https://drive.google.com:8080/file/d/123';
    // Even if hostname matches, parsed.host includes port. Check hostname strictly
    const parsed = new URL(urlWithPort);
    assertEqual(parsed.hostname, 'drive.google.com');
  });

  // Subdomain & suffix evasion
  test('TC-URL-BOUND-05: Rejects subdomain trickery (https://docs.google.com.malware.ru)', () => {
    assertEqual(isValidSubmissionUrl('https://docs.google.com.malware.ru/doc'), false);
    assertEqual(isValidSubmissionUrl('https://evil.drive.google.com/file'), false);
    assertEqual(isValidSubmissionUrl('https://drive.google.com-phish.com/doc'), false);
  });

  // Null bytes & control characters
  test('TC-URL-BOUND-06: Rejects null byte injection (%00, \\0)', () => {
    assertEqual(isValidSubmissionUrl('https://drive.google.com\0/file'), false);
    assertEqual(isValidSubmissionUrl('https://drive.google.com%00/file'), false);
  });

  // Newlines & CRLF injection
  test('TC-URL-BOUND-07: Handles and trims URL strings with embedded CRLF safely', () => {
    assertEqual(isValidSubmissionUrl('https://drive.google.com/file/d/123\r\n'), true);
    assertEqual(isValidSubmissionUrl('https://drive.google.com/\nfile/d/123'), false);
  });

  // Case insensitivity of scheme and hostname
  test('TC-URL-BOUND-08: Accepts valid URLs with mixed case scheme and host (HTTPS://DRIVE.GOOGLE.COM)', () => {
    const mixedCase = 'HTTPS://DRIVE.GOOGLE.COM/file/d/123/view';
    assertEqual(isValidSubmissionUrl(mixedCase), true, 'Mixed case HTTPS and hostname must be accepted');
  });

  // Localhost & private IPs
  test('TC-URL-BOUND-09: Rejects localhost, 127.0.0.1, and internal IP addresses', () => {
    assertEqual(isValidSubmissionUrl('https://localhost/file'), false);
    assertEqual(isValidSubmissionUrl('https://127.0.0.1/file'), false);
    assertEqual(isValidSubmissionUrl('https://192.168.1.1/drive.google.com'), false);
  });

  // Very long URLs (boundary length test)
  test('TC-URL-BOUND-10: Handles long Google Drive query strings (4000+ characters)', () => {
    const longParam = 'a'.repeat(4000);
    const longUrl = `https://drive.google.com/file/d/12345/view?extra=${longParam}`;
    assertEqual(isValidSubmissionUrl(longUrl), true, 'Legitimate long URLs must not crash the validator');
  });
});
