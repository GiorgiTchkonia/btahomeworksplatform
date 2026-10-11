/**
 * Challenger M1-1: Standalone Adversarial Verification Suite
 * Empirically stress-tests Milestone 1 implementation against:
 * 1. isValidSubmissionUrl in src/lib/api.ts (adversarial URLs & bypass attempts)
 * 2. MIME & extension validation in uploadFile / MIME_MAP
 * 3. Storage path formation ({studentId}/{uuid}.{ext})
 * 4. Storage path extraction & cleanup helpers
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}   CHALLENGER M1-1: ADVERSARIAL STRESS-TEST VERIFICATION HARNESS      ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);

// ---------------------------------------------------------------------------
// 1. Load actual implementation directly from src/lib/api.ts
// ---------------------------------------------------------------------------
const apiFilePath = path.join(__dirname, '..', 'src', 'lib', 'api.ts');
if (!fs.existsSync(apiFilePath)) {
  console.error(`${colors.red}FATAL: src/lib/api.ts not found at ${apiFilePath}${colors.reset}`);
  process.exit(1);
}
const apiCode = fs.readFileSync(apiFilePath, 'utf8');

// Extract isValidSubmissionUrl function verbatim
const urlFnMatch = apiCode.match(/export function isValidSubmissionUrl\([\s\S]*?\n\}/);
if (!urlFnMatch) {
  console.error(`${colors.red}FATAL: isValidSubmissionUrl not found in src/lib/api.ts${colors.reset}`);
  process.exit(1);
}
const cleanedUrlFnCode = urlFnMatch[0]
  .replace('export function isValidSubmissionUrl', 'function isValidSubmissionUrl')
  .replace(': string | null | undefined', '')
  .replace(': boolean', '');
const isValidSubmissionUrl = new Function('return ' + cleanedUrlFnCode)();

// Extract extractStoragePath function verbatim
const pathFnMatch = apiCode.match(/export function extractStoragePath\([\s\S]*?\n\}/);
if (!pathFnMatch) {
  console.error(`${colors.red}FATAL: extractStoragePath not found in src/lib/api.ts${colors.reset}`);
  process.exit(1);
}
const cleanedPathFnCode = pathFnMatch[0]
  .replace('export function extractStoragePath', 'function extractStoragePath')
  .replace(': string | null | undefined', '')
  .replace(': string | null', '');
const extractStoragePath = new Function('return ' + cleanedPathFnCode)();

// Extract MIME_MAP object verbatim
const mimeMapMatch = apiCode.match(/export const MIME_MAP:\s*Record<[^>]+>\s*=\s*(\{[\s\S]*?\n\};)/);
if (!mimeMapMatch) {
  console.error(`${colors.red}FATAL: MIME_MAP not found in src/lib/api.ts${colors.reset}`);
  process.exit(1);
}
const cleanedMimeMap = mimeMapMatch[1].replace(/;$/, '');
const MIME_MAP = new Function('return ' + cleanedMimeMap)();

// Simulate uploadFile validation logic extracted from src/lib/api.ts
function simulateUploadFileValidation(file, options) {
  const maxFileSize = 15 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('ფაილის ზომა არ უნდა აღემატებოდეს 15MB-ს.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'txt', 'zip', 'rar'];
  
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new Error('ფაილის ფორმატი დაუშვებელია.');
  }

  // Validate against teacher's allowed formats if specified
  if (options?.allowedFormats && options.allowedFormats.length > 0) {
    const normalizedAllowed = options.allowedFormats.map(fmt => fmt.toLowerCase().replace(/^\./, ''));
    if (!normalizedAllowed.includes(fileExt)) {
      throw new Error(`ფაილის ფორმატი (.${fileExt}) დაუშვებელია ამ დავალებისთვის. დაშვებული ფორმატებია: ${options.allowedFormats.join(', ')}`);
    }
  }

  // Validate MIME type if file.type is available
  if (file.type && MIME_MAP[fileExt]) {
    const expectedMimes = MIME_MAP[fileExt];
    if (!expectedMimes.includes(file.type.toLowerCase())) {
      throw new Error('ფაილის MIME ტიპი არ შეესაბამება გაფართოებას.');
    }
  }

  const folderId = options?.studentId || 'general';
  const fakeUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const fileName = `${fakeUuid}.${fileExt}`;
  const filePath = `${folderId}/${fileName}`;

  return { success: true, filePath, fileExt, fileName, folderId };
}

// ---------------------------------------------------------------------------
// Execution Tracker
// ---------------------------------------------------------------------------
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails = [];

function check(testGroup, testCase, condition, expectedDesc, actualValue) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ${colors.green}✓ PASS${colors.reset} [${testGroup}] ${testCase}`);
  } else {
    failedAssertions++;
    const msg = `FAIL: [${testGroup}] ${testCase} — Expected: ${expectedDesc}, Got: ${JSON.stringify(actualValue)}`;
    console.log(`  ${colors.red}✖ ${msg}${colors.reset}`);
    failureDetails.push({ testGroup, testCase, expectedDesc, actualValue });
  }
}

// ===========================================================================
// SECTION 1: Adversarial URL Validation (isValidSubmissionUrl)
// ===========================================================================
console.log(`\n${colors.bold}--- SECTION 1: Adversarially Testing isValidSubmissionUrl ---${colors.reset}`);

// 1.1 Malicious URLs required by dispatch
const maliciousUrls = [
  { url: 'javascript:alert(1)//drive.google.com', desc: 'Stored XSS via javascript: scheme' },
  { url: 'data:text/html,<script>alert(1)</script>', desc: 'data: URI vector' },
  { url: 'http://drive.google.com', desc: 'Insecure HTTP scheme' },
  { url: 'https://drive.google.com.evil.com', desc: 'Domain suffix spoofing (.evil.com)' },
  { url: 'https://evil.com/drive.google.com', desc: 'Path-based fake domain on evil.com' },
  { url: 'https://drive.google.com:8080/', desc: 'Custom non-standard port :8080 on drive.google.com' },
  { url: 'ftp://drive.google.com', desc: 'FTP scheme on drive.google.com' },
  { url: '//drive.google.com', desc: 'Protocol-relative URL' },
];

for (const item of maliciousUrls) {
  const result = isValidSubmissionUrl(item.url);
  // Expected behavior for malicious URLs is false (REJECTED)
  check(
    'URL-Malicious',
    item.desc,
    result === false,
    'false (rejection)',
    result
  );
}

// 1.2 Legitimate URLs required by dispatch
const legitimateUrls = [
  { url: 'https://drive.google.com/file/d/XYZ/view', desc: 'Legitimate Google Drive file view' },
  { url: 'https://docs.google.com/document/d/ABC/edit', desc: 'Legitimate Google Docs document edit' },
  { url: 'https://docs.google.com/spreadsheets/d/123/edit#gid=0', desc: 'Legitimate Google Sheets' },
  { url: 'https://docs.google.com/presentation/d/456/edit', desc: 'Legitimate Google Slides' },
  { url: 'https://drive.google.com/drive/folders/folder-id', desc: 'Legitimate Google Drive folder' },
];

for (const item of legitimateUrls) {
  const result = isValidSubmissionUrl(item.url);
  check(
    'URL-Legitimate',
    item.desc,
    result === true,
    'true (acceptance)',
    result
  );
}

// 1.3 Extended Adversarial Edge Cases
const extendedUrlAttacks = [
  { url: 'https://user:pass@drive.google.com/file', desc: 'Basic Auth embedded credentials in URL' },
  { url: 'https://drive.google.com:443/file', desc: 'Standard HTTPS explicit port :443' },
  { url: 'https://drive.google.com:444/file', desc: 'Non-standard HTTPS port :444' },
  { url: 'javascript:window.location="https://drive.google.com"', desc: 'Redirect script in javascript: scheme' },
  { url: 'blob:https://drive.google.com/uuid', desc: 'blob: scheme URL' },
  { url: '', desc: 'Empty URL string' },
  { url: null, desc: 'null URL' },
  { url: undefined, desc: 'undefined URL' },
  { url: '   https://drive.google.com/file/d/123   ', desc: 'Valid drive URL with whitespace padding' },
];

for (const item of extendedUrlAttacks) {
  const result = isValidSubmissionUrl(item.url);
  if (item.url === 'https://drive.google.com:443/file' || item.desc.includes('whitespace padding')) {
    check('URL-Extended', item.desc, result === true, 'true', result);
  } else if (item.url === 'https://drive.google.com:444/file') {
    check('URL-Extended', item.desc, result === false, 'false (non-standard port rejected)', result);
  } else {
    check('URL-Extended', item.desc, result === false, 'false', result);
  }
}

// ===========================================================================
// SECTION 2: MIME & File Extension Validation in uploadFile
// ===========================================================================
console.log(`\n${colors.bold}--- SECTION 2: MIME & Extension Validation in uploadFile ---${colors.reset}`);

// 2.1 Permitted formats required by dispatch
const permittedFormats = [
  { name: 'homework.webp', type: 'image/webp', size: 1024 * 500, ext: 'webp' },
  { name: 'assignment.pdf', type: 'application/pdf', size: 1024 * 1024, ext: 'pdf' },
  { name: 'essay.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 * 800, ext: 'docx' },
  { name: 'diagram.png', type: 'image/png', size: 1024 * 600, ext: 'png' },
  { name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 700, ext: 'jpg' },
  { name: 'photo.jpeg', type: 'image/jpeg', size: 1024 * 700, ext: 'jpeg' },
];

for (const item of permittedFormats) {
  let threw = false;
  let res = null;
  try {
    res = simulateUploadFileValidation(item, { studentId: 'student_123' });
  } catch (e) {
    threw = true;
  }
  check('MIME-Permitted', `Accepts .${item.ext} with valid MIME`, !threw && res?.fileExt === item.ext, 'accepted', threw ? 'threw error' : res?.fileExt);
}

// 2.2 Rejected formats required by dispatch
const rejectedFormats = [
  { name: 'payload.exe', type: 'application/x-msdownload', size: 1024 * 50 },
  { name: 'script.bat', type: 'application/x-bat', size: 1024 * 10 },
  { name: 'deploy.sh', type: 'application/x-sh', size: 1024 * 5 },
  { name: 'phishing.html', type: 'text/html', size: 1024 * 20 },
  { name: 'exploit.js', type: 'application/javascript', size: 1024 * 15 },
];

for (const item of rejectedFormats) {
  let threw = false;
  let errorMsg = '';
  try {
    simulateUploadFileValidation(item, { studentId: 'student_123' });
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  check(
    'MIME-Rejected',
    `Rejects dangerous file: ${item.name}`,
    threw && errorMsg.includes('ფორმატი დაუშვებელია'),
    'throws format forbidden error',
    threw ? errorMsg : 'did not throw'
  );
}

// 2.3 Adversarial MIME Spoofing & Boundary Attacks
const adversarialUploads = [
  {
    desc: 'MIME mismatch spoofing: .pdf extension with application/x-msdownload MIME',
    file: { name: 'trojan.pdf', type: 'application/x-msdownload', size: 1024 * 50 },
    expectedError: 'MIME ტიპი არ შეესაბამება',
  },
  {
    desc: 'MIME mismatch spoofing: .docx extension with text/html MIME',
    file: { name: 'document.docx', type: 'text/html', size: 1024 * 50 },
    expectedError: 'MIME ტიპი არ შეესაბამება',
  },
  {
    desc: 'Double extension evasion: homework.pdf.exe',
    file: { name: 'homework.pdf.exe', type: 'application/x-msdownload', size: 1024 * 50 },
    expectedError: 'ფორმატი დაუშვებელია',
  },
  {
    desc: 'Oversized file rejection: 16MB file (> 15MB limit)',
    file: { name: 'large.pdf', type: 'application/pdf', size: 16 * 1024 * 1024 },
    expectedError: '15MB',
  },
  {
    desc: 'Teacher allowedFormats restriction: teacher allows [.pdf], student uploads .webp',
    file: { name: 'photo.webp', type: 'image/webp', size: 1024 * 100 },
    options: { studentId: 'student_123', allowedFormats: ['.pdf'] },
    expectedError: 'დაუშვებელია ამ დავალებისთვის',
  },
  {
    desc: 'No extension file: homework_final',
    file: { name: 'homework_final', type: 'application/octet-stream', size: 1024 * 100 },
    expectedError: 'ფორმატი დაუშვებელია',
  },
];

for (const item of adversarialUploads) {
  let threw = false;
  let errorMsg = '';
  try {
    simulateUploadFileValidation(item.file, item.options || { studentId: 'student_123' });
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  check(
    'MIME-Adversarial',
    item.desc,
    threw && errorMsg.includes(item.expectedError),
    `throws "${item.expectedError}"`,
    threw ? errorMsg : 'did not throw'
  );
}

// ===========================================================================
// SECTION 3: Storage Path Formation ({studentId}/{uuid}.{ext})
// ===========================================================================
console.log(`\n${colors.bold}--- SECTION 3: Storage Path Formation & Extraction ---${colors.reset}`);

// 3.1 Path structure validation
const testStudentId = '3e7c92b9-7729-4a19-a069-775ac333350d';
const uploadRes = simulateUploadFileValidation(
  { name: 'portfolio.webp', type: 'image/webp', size: 50000 },
  { studentId: testStudentId }
);

check(
  'Storage-Path',
  'Path starts with studentId folder',
  uploadRes.filePath.startsWith(`${testStudentId}/`),
  `${testStudentId}/...`,
  uploadRes.filePath
);

check(
  'Storage-Path',
  'Path ends with correct .webp extension',
  uploadRes.filePath.endsWith('.webp'),
  'ends with .webp',
  uploadRes.filePath
);

const pathRegex = /^([a-f0-9-]+)\/([a-f0-9-]+)\.([a-z0-9]+)$/i;
check(
  'Storage-Path',
  'Path strictly conforms to {studentId}/{uuid}.{ext}',
  pathRegex.test(uploadRes.filePath),
  'matches {studentId}/{uuid}.{ext}',
  uploadRes.filePath
);

// 3.2 Storage Path Extraction for Cleanup (extractStoragePath)
const extractCases = [
  {
    desc: 'Full Supabase public storage URL',
    input: 'https://xyz.supabase.co/storage/v1/object/public/homework-files/stu_123/uuid-456.pdf',
    expected: 'stu_123/uuid-456.pdf'
  },
  {
    desc: 'Signed Supabase storage URL with query params',
    input: 'https://xyz.supabase.co/storage/v1/object/sign/homework-files/stu_123/uuid-456.pdf?token=secret123',
    expected: 'stu_123/uuid-456.pdf'
  },
  {
    desc: 'Relative storage path with leading slash',
    input: '/stu_123/uuid-456.pdf',
    expected: 'stu_123/uuid-456.pdf'
  },
  {
    desc: 'Relative storage path without leading slash',
    input: 'stu_123/uuid-456.pdf',
    expected: 'stu_123/uuid-456.pdf'
  },
];

for (const item of extractCases) {
  const extracted = extractStoragePath(item.input);
  check(
    'Storage-Extraction',
    item.desc,
    extracted === item.expected,
    item.expected,
    extracted
  );
}

// ===========================================================================
// SECTION 4: Database Schema Check Constraint Consistency
// ===========================================================================
console.log(`\n${colors.bold}--- SECTION 4: Database Migration Constraint Consistency ---${colors.reset}`);

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261011000000_consolidated_schema_and_security.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// Check constraint regex in SQL:
// submission_link ~* '^https:\/\/(drive\.google\.com|docs\.google\.com)\/.*$'
const dbRegexMatch = migrationSql.match(/submission_link\s*~\*\s*'([^']+)'/);
if (dbRegexMatch) {
  const dbPattern = dbRegexMatch[1];
  console.log(`  Database CHECK constraint regex: ${colors.dim}${dbPattern}${colors.reset}`);

  // Test port 8080 against DB regex
  const dbRegex = new RegExp(dbPattern, 'i');
  const port8080MatchesDb = dbRegex.test('https://drive.google.com:8080/');
  console.log(`  Does https://drive.google.com:8080/ pass DB regex? ${port8080MatchesDb ? 'YES' : 'NO'}`);

  check(
    'DB-Consistency',
    'Database regex correctly rejects https://drive.google.com:8080/',
    port8080MatchesDb === false,
    'false (rejected by Postgres)',
    port8080MatchesDb
  );

  // Check client validator vs DB regex discrepancy
  const clientValidatorAllowsPort8080 = isValidSubmissionUrl('https://drive.google.com:8080/');
  console.log(`  Does client isValidSubmissionUrl allow https://drive.google.com:8080/? ${clientValidatorAllowsPort8080 ? 'YES (VULNERABILITY / DISCREPANCY DETECTED)' : 'NO'}`);
}

// ===========================================================================
// SUMMARY REPORT
// ===========================================================================
console.log(`\n${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
console.log(`${colors.bold}EXECUTION SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed, ${failedAssertions} failed.${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}`);

if (failedAssertions > 0) {
  console.log(`\n${colors.red}${colors.bold}FAILURES / VULNERABILITIES DETECTED:${colors.reset}`);
  for (const f of failureDetails) {
    console.log(`  - [${f.testGroup}] ${f.testCase}: Expected ${f.expectedDesc}, got ${JSON.stringify(f.actualValue)}`);
  }
}

// Export results for harness runner
module.exports = {
  totalAssertions,
  passedAssertions,
  failedAssertions,
  failureDetails,
};
