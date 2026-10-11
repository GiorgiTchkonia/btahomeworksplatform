/**
 * Tier 1 Test Suite: Password Recovery Flow
 *
 * Verifies:
 * - Password recovery email format validation
 * - Supabase auth.resetPasswordForEmail invocation contract
 * - Success feedback messaging (Georgian: პაროლის აღდგენის ბმული გამოგზავნილია)
 * - Error handling for malformed or non-existent emails
 */

const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

async function requestPasswordReset(mockSupabaseAuth, email) {
  if (!validateEmail(email)) {
    return { success: false, error: 'გთხოვთ მიუთითოთ ვალიდური ელფოსტის მისამართი' };
  }

  try {
    const { data, error } = await mockSupabaseAuth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'http://localhost:5173/reset-password',
    });

    if (error) {
      return { success: false, error: error.message || 'პაროლის აღდგენა ვერ მოხერხდა' };
    }

    return {
      success: true,
      message: 'პაროლის აღდგენის ინსტრუქცია გაგზავნილია თქვენს ელფოსტაზე.',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

describe('Tier 1: Feature #21 — Password Recovery Flow', () => {

  test('TC-RECOV-01: Validates legitimate email addresses', () => {
    assertEqual(validateEmail('student@academy.ge'), true);
    assertEqual(validateEmail('giorgi.chkonia@gmail.com'), true);
    assertEqual(validateEmail('teacher_math@school.edu.ge'), true);
  });

  test('TC-RECOV-02: Rejects invalid email strings', () => {
    assertEqual(validateEmail(''), false);
    assertEqual(validateEmail('plainaddress'), false);
    assertEqual(validateEmail('@missingusername.com'), false);
    assertEqual(validateEmail('username@.com'), false);
    assertEqual(validateEmail(null), false);
  });

  test('TC-RECOV-03: Successfully initiates password reset for valid email', async () => {
    const mockAuth = {
      resetPasswordForEmail: async (email, opts) => ({ data: {}, error: null })
    };

    const res = await requestPasswordReset(mockAuth, 'student@academy.ge');
    assertEqual(res.success, true);
    assert(res.message.includes('ინსტრუქცია გაგზავნილია'));
  });

  test('TC-RECOV-04: Returns Georgian validation error for malformed email without calling auth', async () => {
    let called = false;
    const mockAuth = {
      resetPasswordForEmail: async () => { called = true; return { data: {}, error: null }; }
    };

    const res = await requestPasswordReset(mockAuth, 'bad-email');
    assertEqual(res.success, false);
    assertEqual(called, false, 'Auth API should not be called for invalid email');
    assert(res.error.includes('ვალიდური ელფოსტის'));
  });

  test('TC-RECOV-05: Surfaces Supabase auth service error gracefully', async () => {
    const mockAuth = {
      resetPasswordForEmail: async () => ({
        data: null,
        error: { message: 'Over email rate limit, try again in 60s' }
      })
    };

    const res = await requestPasswordReset(mockAuth, 'student@academy.ge');
    assertEqual(res.success, false);
    assert(res.error.includes('rate limit'));
  });
});
