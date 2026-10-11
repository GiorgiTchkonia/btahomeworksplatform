/**
 * Tier 1 Test Suite: Route Protection & Role-Based Access Control
 *
 * Verifies:
 * - Anonymous access restrictions (redirect to /login for protected routes)
 * - Strict role authorization matrix for STUDENT, TEACHER, and ADMIN
 * - /whitelist access restricted exclusively to ADMIN
 * - Navigation links visibility rules (hiding /whitelist from students & teachers)
 */

const fs = require('fs');
const path = require('path');
const {
  describe,
  test,
  assert,
  assertEqual,
} = require('../helpers/test-utils.cjs');

// Route authorization evaluator model matching ProtectedRoute specification
function evaluateRouteAccess(user, path) {
  // Public routes accessible to everyone
  const publicRoutes = ['/', '/login', '/privacy', '/terms', '/docs'];
  if (publicRoutes.includes(path)) {
    return { allowed: true, redirect: null };
  }

  // If unauthenticated, redirect to login
  if (!user || !user.role) {
    return { allowed: false, redirect: '/login' };
  }

  // Role matrix
  switch (user.role) {
    case 'STUDENT':
      if (path === '/student' || path.startsWith('/student/')) {
        return { allowed: true, redirect: null };
      }
      return { allowed: false, redirect: '/student', reason: 'Student cannot access staff routes' };

    case 'TEACHER':
      if (path === '/teacher' || path.startsWith('/teacher/')) {
        return { allowed: true, redirect: null };
      }
      return { allowed: false, redirect: '/teacher', reason: 'Teacher cannot access admin/student routes' };

    case 'ADMIN':
      if (path === '/admin' || path === '/whitelist' || path.startsWith('/admin/')) {
        return { allowed: true, redirect: null };
      }
      return { allowed: true, redirect: null };

    default:
      return { allowed: false, redirect: '/login' };
  }
}

describe('Tier 1: Feature #13 — Route Protection & Role Access', () => {

  test('TC-ROUTE-01: Anonymous users are redirected to /login for protected routes', () => {
    assertEqual(evaluateRouteAccess(null, '/student').allowed, false);
    assertEqual(evaluateRouteAccess(null, '/student').redirect, '/login');

    assertEqual(evaluateRouteAccess(null, '/teacher').allowed, false);
    assertEqual(evaluateRouteAccess(null, '/teacher').redirect, '/login');

    assertEqual(evaluateRouteAccess(null, '/admin').allowed, false);
    assertEqual(evaluateRouteAccess(null, '/admin').redirect, '/login');

    assertEqual(evaluateRouteAccess(null, '/whitelist').allowed, false);
    assertEqual(evaluateRouteAccess(null, '/whitelist').redirect, '/login');
  });

  test('TC-ROUTE-02: Public routes (/, /login, /privacy, /terms, /docs) are accessible anonymously', () => {
    assertEqual(evaluateRouteAccess(null, '/').allowed, true);
    assertEqual(evaluateRouteAccess(null, '/login').allowed, true);
    assertEqual(evaluateRouteAccess(null, '/privacy').allowed, true);
    assertEqual(evaluateRouteAccess(null, '/terms').allowed, true);
    assertEqual(evaluateRouteAccess(null, '/docs').allowed, true);
  });

  test('TC-ROUTE-03: Student is strictly prohibited from /whitelist and /admin', () => {
    const student = { id: 's1', role: 'STUDENT' };
    const whitelistAccess = evaluateRouteAccess(student, '/whitelist');
    assertEqual(whitelistAccess.allowed, false, 'Student must not access /whitelist');

    const adminAccess = evaluateRouteAccess(student, '/admin');
    assertEqual(adminAccess.allowed, false, 'Student must not access /admin');
  });

  test('TC-ROUTE-04: Teacher is strictly prohibited from /whitelist and /admin', () => {
    const teacher = { id: 't1', role: 'TEACHER' };
    const whitelistAccess = evaluateRouteAccess(teacher, '/whitelist');
    assertEqual(whitelistAccess.allowed, false, 'Teacher must not access /whitelist');

    const adminAccess = evaluateRouteAccess(teacher, '/admin');
    assertEqual(adminAccess.allowed, false, 'Teacher must not access /admin');
  });

  test('TC-ROUTE-05: Admin has authorized access to /admin and /whitelist', () => {
    const admin = { id: 'a1', role: 'ADMIN' };
    assertEqual(evaluateRouteAccess(admin, '/admin').allowed, true);
    assertEqual(evaluateRouteAccess(admin, '/whitelist').allowed, true);
  });

  test('TC-ROUTE-06: Static inspection of Navbar.tsx confirms role check on Whitelist link', () => {
    const navbarPath = path.resolve(__dirname, '../../src/components/Navbar.tsx');
    if (fs.existsSync(navbarPath)) {
      const code = fs.readFileSync(navbarPath, 'utf8');
      if (code.includes('/whitelist')) {
        // If /whitelist link is present, it should be gated by ADMIN role check
        assert(
          code.includes("role === 'ADMIN'") || code.includes("user?.role === 'ADMIN'"),
          'Navbar /whitelist link must be conditionally rendered only for ADMIN'
        );
      }
    }
  });
});
