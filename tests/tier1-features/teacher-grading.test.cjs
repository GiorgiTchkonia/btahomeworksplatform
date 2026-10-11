/**
 * Tier 1 Test Suite: Teacher Custom Feedback & Grading
 *
 * Verifies:
 * - Teacher custom feedback comment validation
 * - Numeric grade validation (1–10 integer scale, optional/nullable)
 * - Rejection of invalid grades (0, 11, -1, floating point, non-numeric)
 * - Review payload construction for approved and declined submissions
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  validateGrade,
} = require('../helpers/test-utils.cjs');

function buildReviewSubmissionPayload(submissionId, status, feedback, grade) {
  if (!submissionId) throw new Error('submissionId is required');
  if (!['APPROVED', 'DECLINED'].includes(status)) throw new Error('status must be APPROVED or DECLINED');

  const gradeValidation = validateGrade(grade);
  if (!gradeValidation.valid) {
    throw new Error(gradeValidation.error);
  }

  const payload = {
    submission_id: submissionId,
    status,
    teacher_feedback: feedback ? feedback.trim() : (status === 'APPROVED' ? 'მიღებულია' : 'საჭიროებს შესწორებას'),
    reviewed_at: new Date().toISOString(),
  };

  if (gradeValidation.value !== null) {
    payload.grade = gradeValidation.value;
  }

  return payload;
}

describe('Tier 1: Feature #18 — Teacher Custom Feedback & Grading (1-10)', () => {

  test('TC-GRADE-01: Accepts valid integer grades from 1 to 10', () => {
    for (let g = 1; g <= 10; g++) {
      const res = validateGrade(g);
      assertEqual(res.valid, true, `Grade ${g} should be valid`);
      assertEqual(res.value, g);
    }
  });

  test('TC-GRADE-02: Accepts null or empty grade (grading is optional)', () => {
    assertEqual(validateGrade(null).valid, true, 'null grade is valid');
    assertEqual(validateGrade(null).value, null);
    assertEqual(validateGrade(undefined).valid, true, 'undefined grade is valid');
    assertEqual(validateGrade('').valid, true, 'empty string grade is valid');
  });

  test('TC-GRADE-03: Rejects out-of-range grades (< 1 or > 10)', () => {
    const zero = validateGrade(0);
    const negative = validateGrade(-5);
    const eleven = validateGrade(11);
    const hundred = validateGrade(100);

    assertEqual(zero.valid, false, 'Grade 0 must be rejected');
    assertEqual(negative.valid, false, 'Negative grade must be rejected');
    assertEqual(eleven.valid, false, 'Grade 11 must be rejected');
    assertEqual(hundred.valid, false, 'Grade 100 must be rejected');
  });

  test('TC-GRADE-04: Rejects non-integer grades (decimals, floats)', () => {
    const decimal = validateGrade(8.5);
    const floatStr = validateGrade('7.2');

    assertEqual(decimal.valid, false, 'Decimal grade 8.5 must be rejected');
    assertEqual(floatStr.valid, false, 'Decimal string 7.2 must be rejected');
  });

  test('TC-GRADE-05: Rejects non-numeric text strings', () => {
    const text = validateGrade('excellent');
    const nanVal = validateGrade(NaN);

    assertEqual(text.valid, false, 'Text grade must be rejected');
    assertEqual(nanVal.valid, false, 'NaN must be rejected');
  });

  test('TC-GRADE-06: Constructs APPROVED payload with custom Georgian feedback and score', () => {
    const payload = buildReviewSubmissionPayload(
      'sub_101',
      'APPROVED',
      'სანიმუშო ნაშრომია, განსაკუთრებით მე-3 ამოცანის ამოხსნა.',
      10
    );

    assertEqual(payload.status, 'APPROVED');
    assertEqual(payload.grade, 10);
    assertEqual(payload.teacher_feedback, 'სანიმუშო ნაშრომია, განსაკუთრებით მე-3 ამოცანის ამოხსნა.');
    assert(payload.reviewed_at.length > 0);
  });

  test('TC-GRADE-07: Constructs DECLINED payload with revision guidance without score', () => {
    const payload = buildReviewSubmissionPayload(
      'sub_102',
      'DECLINED',
      'გთხოვთ გადაამოწმოთ მე-2 ნაწილის გამოთვლები და ატვირთოთ ხელახლა.',
      null
    );

    assertEqual(payload.status, 'DECLINED');
    assertEqual(payload.grade, undefined);
    assertEqual(payload.teacher_feedback, 'გთხოვთ გადაამოწმოთ მე-2 ნაწილის გამოთვლები და ატვირთოთ ხელახლა.');
  });
});
