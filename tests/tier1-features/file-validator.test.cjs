/**
 * Tier 1 Test Suite: Secure Storage & File Operations
 *
 * Verifies:
 * - Extension and MIME type validation
 * - Explicit .webp image support
 * - Rejection of dangerous executable and script files (.exe, .dll, .js, etc.)
 * - Teacher-specified allowedFormats constraint
 * - Storage path segregation: {studentId}/{uuid}.{ext}
 * - File size boundary enforcement (e.g. 15MB limit)
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  validateFileUpload,
  generateStoragePath,
  MIME_MAP,
  DANGEROUS_EXTENSIONS,
} = require('../helpers/test-utils.cjs');

describe('Tier 1: Feature #4 — Secure Storage & File Operations', () => {

  // Happy Path: Common educational file formats
  test('TC-FILE-01: Accepts valid PDF file with matching MIME type', () => {
    const file = { name: 'geometry_homework.pdf', type: 'application/pdf', size: 1024 * 500 };
    const res = validateFileUpload(file);
    assertEqual(res.valid, true, 'Valid PDF file should be accepted');
    assertEqual(res.ext, 'pdf');
  });

  test('TC-FILE-02: Accepts valid .webp image file (Bug #1 Fix)', () => {
    const file = { name: 'diagram_photo.webp', type: 'image/webp', size: 1024 * 200 };
    const res = validateFileUpload(file);
    assertEqual(res.valid, true, 'WebP file must be accepted');
    assertEqual(res.ext, 'webp');
  });

  test('TC-FILE-03: Accepts standard office documents (docx, xlsx, pptx)', () => {
    const docx = { name: 'essay.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 * 100 };
    const xlsx = { name: 'data.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1024 * 150 };
    const pptx = { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 1024 * 800 };

    assertEqual(validateFileUpload(docx).valid, true, 'DOCX must be accepted');
    assertEqual(validateFileUpload(xlsx).valid, true, 'XLSX must be accepted');
    assertEqual(validateFileUpload(pptx).valid, true, 'PPTX must be accepted');
  });

  test('TC-FILE-04: Accepts compressed archive submissions (zip, rar)', () => {
    const zip = { name: 'project_files.zip', type: 'application/zip', size: 1024 * 1024 * 3 };
    const rar = { name: 'archive.rar', type: 'application/x-rar-compressed', size: 1024 * 1024 * 2 };

    assertEqual(validateFileUpload(zip).valid, true, 'ZIP must be accepted');
    assertEqual(validateFileUpload(rar).valid, true, 'RAR must be accepted');
  });

  // Rejection of Dangerous / Executable Files
  test('TC-FILE-05: Strictly rejects Windows executables (.exe, .dll, .msi)', () => {
    const exe = { name: 'solver.exe', type: 'application/x-msdownload', size: 1024 * 50 };
    const dll = { name: 'chrome_elf.dll', type: 'application/octet-stream', size: 1024 * 20 };
    const msi = { name: 'setup.msi', type: 'application/octet-stream', size: 1024 * 100 };

    assertEqual(validateFileUpload(exe).valid, false, 'EXE must be rejected');
    assertEqual(validateFileUpload(dll).valid, false, 'DLL must be rejected');
    assertEqual(validateFileUpload(msi).valid, false, 'MSI must be rejected');
  });

  test('TC-FILE-06: Strictly rejects scripts and shell files (.js, .sh, .php, .py, .bat)', () => {
    for (const ext of ['js', 'sh', 'php', 'py', 'bat', 'cmd', 'vbs', 'ps1']) {
      const file = { name: `script.${ext}`, type: 'text/plain', size: 1024 };
      const res = validateFileUpload(file);
      assertEqual(res.valid, false, `Dangerous script extension .${ext} must be rejected`);
    }
  });

  // Teacher-Specified allowedFormats Constraint (Bug #2 Fix)
  test('TC-FILE-07: Enforces teacher-specified allowedFormats constraint', () => {
    const teacherAllowed = ['pdf', 'docx'];
    const validPdf = { name: 'homework.pdf', type: 'application/pdf', size: 1024 * 100 };
    const invalidImage = { name: 'homework.png', type: 'image/png', size: 1024 * 100 };

    assertEqual(validateFileUpload(validPdf, teacherAllowed).valid, true, 'PDF should be accepted when in allowedFormats');
    const rejected = validateFileUpload(invalidImage, teacherAllowed);
    assertEqual(rejected.valid, false, 'PNG should be rejected when teacher only allows PDF and DOCX');
    assert(rejected.error.includes('მასწავლებელი ითხოვს'), 'Error should inform user about teacher format requirements');
  });

  test('TC-FILE-08: Normalizes teacher allowedFormats with leading dots or uppercase (.PDF, .Docx)', () => {
    const teacherAllowed = ['.PDF', '.Docx'];
    const validPdf = { name: 'homework.pdf', type: 'application/pdf', size: 1024 * 100 };
    const validDocx = { name: 'homework.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 * 100 };

    assertEqual(validateFileUpload(validPdf, teacherAllowed).valid, true, 'Should accept PDF with normalized allowedFormats');
    assertEqual(validateFileUpload(validDocx, teacherAllowed).valid, true, 'Should accept DOCX with normalized allowedFormats');
  });

  // MIME Type Spoofing Detection
  test('TC-FILE-09: Rejects MIME type spoofing (e.g. executable disguised as PDF)', () => {
    const spoofed = { name: 'malware.pdf', type: 'application/x-msdownload', size: 1024 * 50 };
    const res = validateFileUpload(spoofed);
    assertEqual(res.valid, false, 'MIME mismatch must be rejected');
    assert(res.error.includes('MIME'), 'Error message should mention MIME mismatch');
  });

  // File Size Limit
  test('TC-FILE-10: Rejects files exceeding size limit (15MB)', () => {
    const limit = 15 * 1024 * 1024;
    const oversized = { name: 'large_recording.zip', type: 'application/zip', size: limit + 1024 };
    const res = validateFileUpload(oversized, [], limit);
    assertEqual(res.valid, false, 'Oversized file must be rejected');
    assert(res.error.includes('ზომა'), 'Error message should mention file size');
  });

  // Storage Path Segregation {studentId}/{uuid}.{ext}
  test('TC-FILE-11: Generates segregated storage path matching {studentId}/{uuid}.{ext}', () => {
    const studentId = 'usr_stu_12345';
    const uuid = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    const ext = 'webp';

    const path = generateStoragePath(studentId, ext, uuid);
    assertEqual(path, 'usr_stu_12345/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d.webp');
    assert(path.startsWith(`${studentId}/`), 'Path must be segregated under studentId directory');
  });

  test('TC-FILE-12: Rejects storage path generation without studentId', () => {
    let threw = false;
    try {
      generateStoragePath(null, 'pdf');
    } catch {
      threw = true;
    }
    assertEqual(threw, true, 'generateStoragePath must require studentId');
  });
});
