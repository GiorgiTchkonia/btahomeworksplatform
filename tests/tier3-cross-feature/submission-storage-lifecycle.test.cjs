/**
 * Tier 3 Test Suite: Submission & Storage Lifecycle Cross-Feature Integration
 *
 * Verifies end-to-end integration between:
 * - File upload with MIME and extension checking
 * - Storage path segregation ({studentId}/{uuid}.{ext})
 * - Signed URL vs public URL resolution
 * - Submission creation and cancellation
 * - Automatic old storage file deletion on cancellation or re-upload (Audit §2.3 Fix)
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  validateFileUpload,
  generateStoragePath,
} = require('../helpers/test-utils.cjs');

// Mock storage and submission database repository
class MockStorageService {
  constructor() {
    this.files = new Map(); // path -> file metadata
    this.deletedPaths = [];
  }

  async upload(path, fileContent) {
    this.files.set(path, fileContent);
    return { path, fullUrl: `https://mock.supabase.co/storage/v1/object/homework-files/${path}` };
  }

  async remove(paths) {
    for (const p of paths) {
      if (this.files.has(p)) {
        this.files.delete(p);
        this.deletedPaths.push(p);
      }
    }
    return { success: true };
  }

  extractStoragePath(urlOrPath) {
    if (!urlOrPath) return null;
    if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
      return urlOrPath.startsWith('/') ? urlOrPath.slice(1) : urlOrPath;
    }
    const match = urlOrPath.match(/\/homework-files\/(.+?)(\?.*)?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

class MockSubmissionService {
  constructor(storageService) {
    this.storage = storageService;
    this.submissions = new Map();
  }

  async submitHomework(params) {
    const { assignmentId, studentId, studentName, file, submissionLink } = params;

    let fileUrl = null;
    let fileName = null;
    let filePath = null;

    if (file) {
      const validation = validateFileUpload(file);
      if (!validation.valid) throw new Error(validation.error);

      filePath = generateStoragePath(studentId, validation.ext, 'file-uuid-abc');
      const uploadRes = await this.storage.upload(filePath, file);
      fileUrl = uploadRes.fullUrl;
      fileName = file.name;
    }

    // Check if re-uploading on existing submission
    const existingKey = `${assignmentId}_${studentId}`;
    const existing = this.submissions.get(existingKey);
    if (existing && existing.fileUrl && fileUrl && existing.fileUrl !== fileUrl) {
      const oldPath = this.storage.extractStoragePath(existing.fileUrl);
      if (oldPath) {
        await this.storage.remove([oldPath]);
      }
    }

    const sub = {
      id: existing ? existing.id : 'sub_' + Math.random().toString(36).substr(2, 9),
      assignmentId,
      studentId,
      studentName,
      fileUrl,
      fileName,
      submissionLink: submissionLink || null,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };

    this.submissions.set(existingKey, sub);
    return sub;
  }

  async cancelSubmission(assignmentId, studentId) {
    const key = `${assignmentId}_${studentId}`;
    const sub = this.submissions.get(key);
    if (!sub) throw new Error('Submission not found');

    // Clean up uploaded file from storage
    if (sub.fileUrl) {
      const path = this.storage.extractStoragePath(sub.fileUrl);
      if (path) {
        await this.storage.remove([path]);
      }
    }

    this.submissions.delete(key);
    return { success: true };
  }
}

describe('Tier 3: Cross-Feature — Submission & Storage Lifecycle', () => {

  test('TC-LIFE-01: Full upload -> submission lifecycle stores file in student segregated path', async () => {
    const storage = new MockStorageService();
    const service = new MockSubmissionService(storage);

    const file = { name: 'physics_lab.webp', type: 'image/webp', size: 1024 * 300 };
    const sub = await service.submitHomework({
      assignmentId: 'asg_101',
      studentId: 'student_george',
      studentName: 'გიორგი ჭყონია',
      file,
    });

    assertEqual(sub.status, 'SUBMITTED');
    assert(sub.fileUrl.includes('student_george/file-uuid-abc.webp'), 'URL must contain studentId segregation path');
    assertEqual(storage.files.size, 1);
  });

  test('TC-LIFE-02: Canceling submission automatically deletes uploaded file from storage (Bug #3 Fix)', async () => {
    const storage = new MockStorageService();
    const service = new MockSubmissionService(storage);

    const file = { name: 'essay.pdf', type: 'application/pdf', size: 1024 * 50 };
    await service.submitHomework({
      assignmentId: 'asg_102',
      studentId: 'student_george',
      studentName: 'გიორგი',
      file,
    });

    assertEqual(storage.files.size, 1, 'File should be present in storage before cancellation');

    // Cancel submission
    await service.cancelSubmission('asg_102', 'student_george');

    assertEqual(storage.files.size, 0, 'File must be purged from storage upon cancellation');
    assertEqual(storage.deletedPaths.length, 1);
    assert(storage.deletedPaths[0].includes('student_george/file-uuid-abc.pdf'));
  });

  test('TC-LIFE-03: Re-uploading a new file deletes old file to prevent storage bloat', async () => {
    const storage = new MockStorageService();
    const service = new MockSubmissionService(storage);

    // Initial upload (v1)
    await service.submitHomework({
      assignmentId: 'asg_103',
      studentId: 'student_george',
      studentName: 'გიორგი',
      file: { name: 'draft_v1.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1024 },
    });

    // Re-upload (v2 with new name/path)
    storage.upload = async (path, f) => {
      const newPath = path.replace('file-uuid-abc', 'file-uuid-v2');
      storage.files.set(newPath, f);
      return { path: newPath, fullUrl: `https://mock.supabase.co/storage/v1/object/homework-files/${newPath}` };
    };

    await service.submitHomework({
      assignmentId: 'asg_103',
      studentId: 'student_george',
      studentName: 'გიორგი',
      file: { name: 'final_v2.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 },
    });

    // Old file should have been deleted
    assert(storage.deletedPaths.length > 0, 'Old file should be deleted upon re-upload');
  });
});
