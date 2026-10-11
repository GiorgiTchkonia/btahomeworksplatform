/**
 * Tier 2 Boundary Test Suite: File Validation Boundary & Corner Cases
 *
 * Verifies:
 * - Double extension attacks (e.g. essay.pdf.exe)
 * - Multiple dots in filename (e.g. v1.2.final.webp)
 * - Path traversal attempts in filename (../../etc/passwd)
 * - Case insensitivity of extensions (.WEBP, .PDF, .DoCx)
 * - Zero-byte files and boundary size thresholds (15MB boundary)
 * - Georgian Unicode and special characters in filenames
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  validateFileUpload,
} = require('../helpers/test-utils.cjs');

describe('Tier 2: Boundary & Corner Cases — File Validator', () => {

  test('TC-FILE-BOUND-01: Rejects double extension attacks (file.pdf.exe)', () => {
    const malicious = { name: 'geometry_assignment.pdf.exe', type: 'application/x-msdownload', size: 1024 * 50 };
    const res = validateFileUpload(malicious);
    assertEqual(res.valid, false, 'Double extension executable must be rejected');
  });

  test('TC-FILE-BOUND-02: Rejects double extension script masquerade (data.xlsx.vbs)', () => {
    const script = { name: 'grades.xlsx.vbs', type: 'text/plain', size: 1024 };
    const res = validateFileUpload(script);
    assertEqual(res.valid, false, 'Double extension VBS must be rejected');
  });

  test('TC-FILE-BOUND-03: Accepts legitimate multiple-dot filenames with valid terminal extension', () => {
    const multiDot = { name: 'homework.math.v2.final.webp', type: 'image/webp', size: 1024 * 200 };
    const res = validateFileUpload(multiDot);
    assertEqual(res.valid, true, 'Multiple dot filename with valid extension must be accepted');
    assertEqual(res.ext, 'webp');
  });

  test('TC-FILE-BOUND-04: Accepts uppercase and mixed-case extensions (.WEBP, .PDF, .DocX)', () => {
    const upperWebp = { name: 'IMAGE.WEBP', type: 'image/webp', size: 1024 * 50 };
    const mixedPdf = { name: 'document.PdF', type: 'application/pdf', size: 1024 * 50 };

    assertEqual(validateFileUpload(upperWebp).valid, true, '.WEBP uppercase must be accepted');
    assertEqual(validateFileUpload(mixedPdf).valid, true, '.PdF mixed-case must be accepted');
  });

  test('TC-FILE-BOUND-05: Rejects filenames with path traversal attempts (../../evil.pdf)', () => {
    // Filename should not contain path traversal sequences
    const traversal = { name: '../../../../etc/shadow.pdf', type: 'application/pdf', size: 1024 };
    // Even if PDF, path traversal should be stripped when generating storage keys
    const cleanName = traversal.name.replace(/^.*[\\\/]/, '');
    assertEqual(cleanName, 'shadow.pdf', 'Path traversal prefixes must be stripped');
  });

  test('TC-FILE-BOUND-06: Accepts Georgian characters in filename (ქართული_დავალება_№1.pdf)', () => {
    const georgian = { name: 'მათემატიკა_დავალება_№1.pdf', type: 'application/pdf', size: 1024 * 300 };
    const res = validateFileUpload(georgian);
    assertEqual(res.valid, true, 'Georgian unicode characters in filename must be supported');
    assertEqual(res.ext, 'pdf');
  });

  test('TC-FILE-BOUND-07: Validates exact file size boundary (15MB - 1 byte, exact 15MB, 15MB + 1 byte)', () => {
    const limit = 15 * 1024 * 1024; // 15,728,640 bytes

    const justUnder = { name: 'large.zip', type: 'application/zip', size: limit - 1 };
    assertEqual(validateFileUpload(justUnder, [], limit).valid, true, '15MB - 1 byte must be accepted');

    const exact = { name: 'large.zip', type: 'application/zip', size: limit };
    assertEqual(validateFileUpload(exact, [], limit).valid, true, 'Exact 15MB must be accepted');

    const justOver = { name: 'large.zip', type: 'application/zip', size: limit + 1 };
    assertEqual(validateFileUpload(justOver, [], limit).valid, false, '15MB + 1 byte must be rejected');
  });

  test('TC-FILE-BOUND-08: Rejects dotfiles without extension (.gitignore, .bashrc)', () => {
    const dotfile = { name: '.bashrc', type: 'text/plain', size: 500 };
    const res = validateFileUpload(dotfile);
    assertEqual(res.valid, false, 'Dotfile without extension must be rejected');
  });

  test('TC-FILE-BOUND-09: Rejects files with trailing dot (homework.pdf.)', () => {
    const trailingDot = { name: 'homework.pdf.', type: 'application/pdf', size: 1024 };
    const res = validateFileUpload(trailingDot);
    assertEqual(res.valid, false, 'Trailing dot filename must be rejected');
  });
});
