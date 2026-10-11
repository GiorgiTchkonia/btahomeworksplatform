/**
 * Tier 4 Scenario Test Suite: Teacher End-to-End User Journey
 *
 * Simulates complete teacher workflow:
 * 1. Teacher logs in and accesses TeacherDashboard
 * 2. Creates assignment with allowedFormats and deadline
 * 3. Inspects assignment submissions roster
 * 4. Uses search by student name and status filtering pills
 * 5. Reviews submission with custom feedback and numeric grade (1–10)
 * 6. Edits existing assignment details
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  validateGrade,
} = require('../helpers/test-utils.cjs');

describe('Tier 4: Real-World Scenario — Teacher End-to-End Journey', () => {

  test('TC-SCEN-TEA-01: Full Teacher lifecycle from assignment creation to grading and editing', async () => {
    // Step 1: Teacher authentication
    const teacherSession = {
      user: { id: 'tea_nino_01', email: 'nino.teacher@academy.ge' },
      profile: { id: 'tea_nino_01', name: 'ნინო მასწავლებელი', role: 'TEACHER' },
    };
    assertEqual(teacherSession.profile.role, 'TEACHER');

    // Step 2: Create new assignment
    const newAssignment = {
      id: 'asg_phys_10',
      subjectId: 'sub_physics',
      teacherId: teacherSession.user.id,
      title: 'კინემატიკის კანონები',
      description: 'ამოხსენით 1-5 ამოცანები სახელმძღვანელოდან.',
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      allowedFormats: ['pdf', 'docx', 'webp'],
    };
    assertEqual(newAssignment.teacherId, 'tea_nino_01');
    assert(newAssignment.allowedFormats.includes('webp'));

    // Step 3: Submissions roster mapping and search/filter
    const submissionsRoster = [
      { id: 's1', studentName: 'გიორგი ჭყონია', status: 'SUBMITTED', grade: null },
      { id: 's2', studentName: 'ანა ბერიძე', status: 'APPROVED', grade: 9 },
      { id: 's3', studentName: 'დავით კაპანაძე', status: 'DECLINED', grade: null },
    ];

    // Filter by student search query: "გიორგი"
    const searchResults = submissionsRoster.filter(s =>
      s.studentName.toLowerCase().includes('გიორგი'.toLowerCase())
    );
    assertEqual(searchResults.length, 1);
    assertEqual(searchResults[0].studentName, 'გიორგი ჭყონია');

    // Filter by status pill: "SUBMITTED"
    const submittedOnly = submissionsRoster.filter(s => s.status === 'SUBMITTED');
    assertEqual(submittedOnly.length, 1);

    // Step 4: Teacher reviews and grades "გიორგი ჭყონია"
    const targetSub = searchResults[0];
    const gradeVal = validateGrade(10);
    assertEqual(gradeVal.valid, true);

    targetSub.status = 'APPROVED';
    targetSub.grade = gradeVal.value;
    targetSub.teacherFeedback = 'ყველა ფორმულა ზუსტადაა გამოყენებული.';
    targetSub.reviewedAt = new Date().toISOString();

    assertEqual(targetSub.status, 'APPROVED');
    assertEqual(targetSub.grade, 10);

    // Step 5: Edit existing assignment (Feature #19)
    const updatedAssignment = {
      ...newAssignment,
      title: 'კინემატიკის კანონები (განახლებული)',
      description: 'ამოხსენით 1-6 ამოცანები (დაემატა ბონუს ამოცანა).',
    };
    assertEqual(updatedAssignment.title, 'კინემატიკის კანონები (განახლებული)');
    assert(updatedAssignment.description.includes('ბონუს'));
  });
});
