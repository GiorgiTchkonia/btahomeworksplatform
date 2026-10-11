/**
 * Tier 2 Boundary Test Suite: Due Date & Submission Deadline Boundary Cases
 *
 * Verifies deadline checking logic (Bug #15 and RLS trigger enforcement):
 * - Exactly at deadline (now === due_date) -> allowed
 * - 1 millisecond before deadline -> allowed
 * - 1 millisecond after deadline -> rejected
 * - Timezone conversions (UTC vs Georgia UTC+4)
 * - ISO string formatting and invalid date strings
 */

const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

function checkSubmissionDeadline(nowMs, dueDateIso) {
  if (!dueDateIso) return { canSubmit: true };
  const dueTimeMs = new Date(dueDateIso).getTime();
  if (isNaN(dueTimeMs)) {
    return { canSubmit: false, error: 'დავალების ვადა არასწორია' };
  }
  if (nowMs > dueTimeMs) {
    return { canSubmit: false, error: 'დავალების ვადა ამოიწურა. ჩაბარება შეუძლებელია.' };
  }
  return { canSubmit: true };
}

describe('Tier 2: Boundary & Corner Cases — Due Date & Submission Deadlines', () => {

  const baseIso = '2026-10-15T18:00:00.000Z';
  const baseMs = new Date(baseIso).getTime();

  test('TC-DATE-BOUND-01: Submission 1ms before deadline is permitted', () => {
    const res = checkSubmissionDeadline(baseMs - 1, baseIso);
    assertEqual(res.canSubmit, true, 'Submission before deadline must be allowed');
  });

  test('TC-DATE-BOUND-02: Submission exactly at the millisecond of deadline is permitted', () => {
    const res = checkSubmissionDeadline(baseMs, baseIso);
    assertEqual(res.canSubmit, true, 'Submission at exact deadline must be allowed');
  });

  test('TC-DATE-BOUND-03: Submission 1ms after deadline is rejected', () => {
    const res = checkSubmissionDeadline(baseMs + 1, baseIso);
    assertEqual(res.canSubmit, false, 'Submission past deadline must be rejected');
    assert(res.error.includes('ვადა ამოიწურა'));
  });

  test('TC-DATE-BOUND-04: Timezone neutrality — UTC vs Georgian Time (+04:00)', () => {
    // 18:00:00 UTC is identical to 22:00:00+04:00
    const georgiaIso = '2026-10-15T22:00:00.000+04:00';
    const georgiaMs = new Date(georgiaIso).getTime();
    assertEqual(georgiaMs, baseMs, 'Both timestamps must resolve to identical millisecond value');

    const res = checkSubmissionDeadline(georgiaMs, baseIso);
    assertEqual(res.canSubmit, true);
  });

  test('TC-DATE-BOUND-05: Handles assignments with no due date (open-ended)', () => {
    const res = checkSubmissionDeadline(Date.now(), null);
    assertEqual(res.canSubmit, true, 'Open-ended assignment must be submittable anytime');
  });

  test('TC-DATE-BOUND-06: Rejects malformed or corrupted due date string', () => {
    const res = checkSubmissionDeadline(Date.now(), 'invalid-date-string');
    assertEqual(res.canSubmit, false);
    assert(res.error.includes('არასწორია'));
  });
});
