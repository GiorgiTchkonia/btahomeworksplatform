/**
 * Tier 1 Test Suite: Auth Loop & Duplicate Query Prevention
 *
 * Verifies:
 * - Single-flight lock preventing duplicate concurrent checkUser() calls on login
 * - Ignoring TOKEN_REFRESHED events to prevent redundant profile refetches
 * - Proper state management for authenticated user sessions
 */

const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

// Auth manager model implementing single-flight debounce
class AuthSessionManager {
  constructor(fetchProfileFn) {
    this.fetchProfileFn = fetchProfileFn;
    this.currentUser = null;
    this.isLoading = false;
    this.inFlightPromise = null;
    this.fetchCount = 0;
  }

  async checkUser(callerTag = 'unknown') {
    // If a request is already in-flight, reuse it (single-flight)
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.isLoading = true;
    this.fetchCount++;

    this.inFlightPromise = (async () => {
      try {
        const user = await this.fetchProfileFn();
        this.currentUser = user;
        return user;
      } finally {
        this.isLoading = false;
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }

  handleAuthEvent(event, session) {
    if (event === 'SIGNED_IN') {
      // Trigger checkUser safely with single flight
      return this.checkUser('SIGNED_IN');
    }
    if (event === 'TOKEN_REFRESHED') {
      // Do NOT refetch profile on simple token refresh
      return Promise.resolve(this.currentUser);
    }
    if (event === 'SIGNED_OUT') {
      this.currentUser = null;
      return Promise.resolve(null);
    }
  }
}

describe('Tier 1: Feature #12 — Duplicate Auth Query Prevention', () => {

  test('TC-AUTH-01: Deduplicates simultaneous concurrent checkUser calls', async () => {
    let rawApiCalls = 0;
    const mockFetch = async () => {
      rawApiCalls++;
      await new Promise(r => setTimeout(r, 10));
      return { id: 'usr_1', role: 'STUDENT', name: 'გიორგი' };
    };

    const manager = new AuthSessionManager(mockFetch);

    // Simulate login where onLoginSuccess and SIGNED_IN event fire almost simultaneously
    const [u1, u2] = await Promise.all([
      manager.checkUser('onLoginSuccess'),
      manager.checkUser('SIGNED_IN'),
    ]);

    assertEqual(rawApiCalls, 1, 'Only 1 network fetch should execute for concurrent calls');
    assertEqual(manager.fetchCount, 1);
    assertEqual(u1.id, 'usr_1');
    assertEqual(u2.id, 'usr_1');
  });

  test('TC-AUTH-02: Ignores TOKEN_REFRESHED to avoid unnecessary database queries', async () => {
    let rawApiCalls = 0;
    const mockFetch = async () => {
      rawApiCalls++;
      return { id: 'usr_1', role: 'STUDENT' };
    };

    const manager = new AuthSessionManager(mockFetch);
    await manager.checkUser('initial_load');
    assertEqual(rawApiCalls, 1);

    // Simulate periodic TOKEN_REFRESHED event
    await manager.handleAuthEvent('TOKEN_REFRESHED', { access_token: 'new_token' });
    assertEqual(rawApiCalls, 1, 'TOKEN_REFRESHED must not trigger another profile fetch');
  });

  test('TC-AUTH-03: SIGNED_OUT cleanly clears session without network fetch', async () => {
    const manager = new AuthSessionManager(async () => ({ id: 'usr_1' }));
    await manager.checkUser();
    assert(manager.currentUser !== null);

    await manager.handleAuthEvent('SIGNED_OUT');
    assertEqual(manager.currentUser, null, 'User session must be cleared on logout');
  });
});
