/**
 * Tier 1 Test Suite: Assignment Editing & Submission Search/Filtering
 *
 * Verifies:
 * - Assignment update payload validation (title, description, deadline, formats)
 * - Submission search by student name (case-insensitive, trimmed)
 * - Status filter pill matching (ALL, SUBMITTED, APPROVED, DECLINED, UNSUBMITTED)
 * - Edge case handling in search/filter pipelines
 */

const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

function validateAssignmentUpdate(updates) {
  if (!updates || typeof updates !== 'object') {
    return { valid: false, error: 'განახლების პარამეტრები სავალდებულოა' };
  }

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      return { valid: false, error: 'სათაური არ შეიძლება იყოს ცარიელი' };
    }
  }

  if (updates.deadline !== undefined) {
    const d = new Date(updates.deadline);
    if (isNaN(d.getTime())) {
      return { valid: false, error: 'დედლაინის თარიღი არავალიდურია' };
    }
  }

  if (updates.allowed_formats !== undefined) {
    if (!Array.isArray(updates.allowed_formats) || updates.allowed_formats.length === 0) {
      return { valid: false, error: 'მინიმუმ ერთი ფორმატი უნდა იყოს მითითებული' };
    }
  }

  return { valid: true };
}

function filterRoster(roster, searchQuery, statusFilter) {
  return roster.filter(item => {
    // 1. Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNSUBMITTED') {
        if (item.submission) return false;
      } else {
        if (!item.submission || item.submission.status !== statusFilter) return false;
      }
    }

    // 2. Search Query (student name)
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const studentName = (item.student.name || '').toLowerCase();
      if (!studentName.includes(q)) return false;
    }

    return true;
  });
}

describe('Tier 1: Feature #19 — Assignment Editing & Submission Search/Filtering', () => {

  test('TC-ASSIGN-01: Validates legitimate assignment edit payload', () => {
    const validUpdate = {
      title: 'მათემატიკა - დავალება 3',
      description: 'ამოხსენით მე-4 თავის ამოცანები',
      deadline: '2026-12-31T23:59:00.000Z',
      allowed_formats: ['PDF', 'IMAGE'],
    };

    const res = validateAssignmentUpdate(validUpdate);
    assertEqual(res.valid, true);
  });

  test('TC-ASSIGN-02: Rejects empty or whitespace-only assignment title', () => {
    assertEqual(validateAssignmentUpdate({ title: '' }).valid, false);
    assertEqual(validateAssignmentUpdate({ title: '   ' }).valid, false);
  });

  test('TC-ASSIGN-03: Rejects invalid deadline date format', () => {
    assertEqual(validateAssignmentUpdate({ deadline: 'invalid-date-string' }).valid, false);
  });

  test('TC-ASSIGN-04: Rejects empty allowed_formats array', () => {
    assertEqual(validateAssignmentUpdate({ allowed_formats: [] }).valid, false);
  });

  test('TC-ASSIGN-05: Filters submissions accurately by student name', () => {
    const mockRoster = [
      { student: { name: 'გიორგი ჭყონია' }, submission: { status: 'SUBMITTED' } },
      { student: { name: 'ნინო ბერიძე' }, submission: { status: 'APPROVED' } },
      { student: { name: 'დავით კაპანაძე' }, submission: null },
    ];

    const filtered = filterRoster(mockRoster, 'გიორგი', 'ALL');
    assertEqual(filtered.length, 1);
    assertEqual(filtered[0].student.name, 'გიორგი ჭყონია');
  });

  test('TC-ASSIGN-06: Filters submissions accurately by status pills', () => {
    const mockRoster = [
      { student: { name: 'სტუდენტი 1' }, submission: { status: 'SUBMITTED' } },
      { student: { name: 'სტუდენტი 2' }, submission: { status: 'APPROVED' } },
      { student: { name: 'სტუდენტი 3' }, submission: { status: 'DECLINED' } },
      { student: { name: 'სტუდენტი 4' }, submission: null },
    ];

    assertEqual(filterRoster(mockRoster, '', 'ALL').length, 4);
    assertEqual(filterRoster(mockRoster, '', 'SUBMITTED').length, 1);
    assertEqual(filterRoster(mockRoster, '', 'APPROVED').length, 1);
    assertEqual(filterRoster(mockRoster, '', 'DECLINED').length, 1);
    assertEqual(filterRoster(mockRoster, '', 'UNSUBMITTED').length, 1);
  });

  test('TC-ASSIGN-07: Combines search query and status filter correctly', () => {
    const mockRoster = [
      { student: { name: 'გიორგი ჭყონია' }, submission: { status: 'SUBMITTED' } },
      { student: { name: 'გიორგი მაისურაძე' }, submission: { status: 'APPROVED' } },
      { student: { name: 'ანა კალანდაძე' }, submission: { status: 'SUBMITTED' } },
    ];

    // Search "გიორგი" AND status "APPROVED"
    const result = filterRoster(mockRoster, 'გიორგი', 'APPROVED');
    assertEqual(result.length, 1);
    assertEqual(result[0].student.name, 'გიორგი მაისურაძე');
  });
});
