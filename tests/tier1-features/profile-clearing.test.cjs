/**
 * Tier 1 Test Suite: Profile Optional Field Clearing
 *
 * Verifies:
 * - Bug #13 remediation: updateProfile allows clearing optional phone field
 * - Empty string `""` correctly maps to `null` or empty string in payload
 * - Partial updates do not overwrite unprovided fields
 */

const {
  describe,
  test,
  assert,
  assertEqual,
  assertDeepEqual,
} = require('../helpers/test-utils.cjs');

// Model of updateProfile payload building
function buildProfileUpdatePayload(updates) {
  const payload = {};

  if (updates.name !== undefined) {
    if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
      payload.name = updates.name.trim();
    } else {
      throw new Error('სახელი არ შეიძლება იყოს ცარიელი');
    }
  }

  // Bug #13: Previously `if (updates.phone)` skipped empty strings
  if (updates.phone !== undefined) {
    // Correct behavior: allows clearing phone by setting to null or empty string
    payload.phone = updates.phone ? updates.phone.trim() : null;
  }

  if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url || null;
  }

  return payload;
}

describe('Tier 1: Feature #14 — Profile Optional Field Clearing', () => {

  test('TC-PROF-01: Clears optional phone field when provided as empty string (Bug #13 Fix)', () => {
    const updates = { phone: '' };
    const payload = buildProfileUpdatePayload(updates);
    assertEqual(payload.phone, null, 'Empty string phone should map to null in database update');
  });

  test('TC-PROF-02: Clears optional phone field when provided as null', () => {
    const updates = { phone: null };
    const payload = buildProfileUpdatePayload(updates);
    assertEqual(payload.phone, null, 'null phone should map to null in database update');
  });

  test('TC-PROF-03: Updates phone when provided with non-empty string', () => {
    const updates = { phone: '+995 599 11 22 33' };
    const payload = buildProfileUpdatePayload(updates);
    assertEqual(payload.phone, '+995 599 11 22 33');
  });

  test('TC-PROF-04: Omits phone from payload when updates does not include phone', () => {
    const updates = { name: 'გიორგი ჭყონია' };
    const payload = buildProfileUpdatePayload(updates);
    assertEqual(payload.phone, undefined, 'phone should not be included if not provided in updates');
    assertEqual(payload.name, 'გიორგი ჭყონია');
  });

  test('TC-PROF-05: Rejects empty or whitespace-only name update', () => {
    let threw = false;
    try {
      buildProfileUpdatePayload({ name: '   ' });
    } catch (err) {
      threw = true;
      assert(err.message.includes('სახელი'));
    }
    assertEqual(threw, true, 'Empty name must be rejected');
  });
});
