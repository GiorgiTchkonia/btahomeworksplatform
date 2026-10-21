import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { DialogProvider } from './components/ui/DialogProvider';
import { ThemeProvider } from './components/ui/ThemeProvider';
import LocalizedForms from './components/ui/LocalizedForms';
import { User } from './types';
import { supabase } from './lib/supabase';

// Route-level code splitting using React.lazy()
const LoginPage = React.lazy(() => import('./pages_view/LoginPage'));
const ResetPasswordPage = React.lazy(() => import('./pages_view/ResetPasswordPage'));
const TeacherDashboardPage = React.lazy(() => import('./pages_view/TeacherDashboardPage'));
const TeacherAssignmentDetailsPage = React.lazy(() => import('./pages_view/TeacherAssignmentDetailsPage'));
const StudentDashboardPage = React.lazy(() => import('./pages_view/StudentDashboardPage'));
const WhitelistPage = React.lazy(() => import('./pages_view/WhitelistPage'));
const AdminDashboardPage = React.lazy(() => import('./pages_view/AdminDashboardPage'));
const DocumentationPage = React.lazy(() => import('./pages_view/DocumentationPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages_view/PrivacyPolicyPage'));
const PrivacyPage = React.lazy(() => import('./pages_view/PrivacyPage'));
const TermsPage = React.lazy(() => import('./pages_view/TermsPage'));

function PageLoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl mt-6"></div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const inFlightCheckRef = useRef<Promise<void> | null>(null);
  const authVersion = useRef(0);

  const checkUser = async () => {
    if (inFlightCheckRef.current) {
      return inFlightCheckRef.current;
    }

    const version = authVersion.current;
    const promise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user.email_confirmed_at) {
          if (version !== authVersion.current) return;
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: accountState, error: activationError } = await supabase.rpc('get_my_account_state');
        if (version !== authVersion.current) return;
        if (activationError || accountState !== 'ACTIVE') {
          setUser(null);
          if (accountState === 'PASSWORD_REQUIRED') navigate('/accept-invite');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (version !== authVersion.current) return;
        if (error || !profile) {
          setUser(null);
        } else {
          setUser(profile as User);
        }
      } catch {
        if (version === authVersion.current) setUser(null);
      } finally {
        if (version === authVersion.current) {
          setLoading(false);
          inFlightCheckRef.current = null;
        }
      }
    })();

    inFlightCheckRef.current = promise;
    return promise;
  };

  useEffect(() => {
    checkUser();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const scheduleCheck = () => {
      const timer = setTimeout(() => { timers.delete(timer); void checkUser(); }, 0);
      timers.add(timer);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
        return;
      }
      if (event === 'SIGNED_OUT') {
        authVersion.current++;
        inFlightCheckRef.current = null;
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Prevent redundant profile query on token refresh if session already active
        if (!user && session) {
          scheduleCheck();
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        scheduleCheck();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-[#2B4EFF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="bta-theme">
        <DialogProvider>
          <LocalizedForms>
          <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
            <Navbar user={user} onLogout={() => setUser(null)} onUserUpdated={(u) => setUser(u)} />
            
            <main className="flex-1 flex flex-col w-full">
              <Suspense fallback={<PageLoadingSkeleton />}>
                <Switch>
                  <Route path="/reset-password"><ResetPasswordPage /></Route>
                  <Route path="/accept-invite"><ResetPasswordPage invitation /></Route>
                  <Route path="/">
                    {() => {
                      if (!user) return <DocumentationPage />;
                      if (user.role === 'ADMIN') return <Redirect to="/admin" />;
                      if (user.role === 'TEACHER') return <Redirect to="/teacher" />;
                      return <Redirect to="/student" />;
                    }}
                  </Route>

                  <Route path="/login">
                    {() => {
                      if (user?.role === 'ADMIN') return <Redirect to="/admin" />;
                      if (user?.role === 'TEACHER') return <Redirect to="/teacher" />;
                      if (user?.role === 'STUDENT') return <Redirect to="/student" />;
                      return <LoginPage onLoginSuccess={checkUser} />;
                    }}
                  </Route>

                  <Route path="/admin">
                    <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><AdminDashboardPage /></div>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/teacher">
                    <ProtectedRoute user={user} allowedRoles={['TEACHER']}>
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><TeacherDashboardPage /></div>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/teacher/assignments/:id">
                    <ProtectedRoute user={user} allowedRoles={['TEACHER']}>
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><TeacherAssignmentDetailsPage /></div>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/student">
                    <ProtectedRoute user={user} allowedRoles={['STUDENT']}>
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><StudentDashboardPage /></div>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/whitelist">
                    <ProtectedRoute user={user} allowedRoles={['ADMIN']}>
                      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8"><WhitelistPage /></div>
                    </ProtectedRoute>
                  </Route>

                  <Route path="/privacy">
                    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                      <PrivacyPolicyPage />
                    </div>
                  </Route>

                  <Route path="/privacy-policy">
                    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                      <PrivacyPage />
                    </div>
                  </Route>

                  <Route path="/terms">
                    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                      <TermsPage />
                    </div>
                  </Route>

                  <Route>
                    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 text-center flex-1 flex flex-col items-center justify-center">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">გვერდი ვერ მოიძებნა (404)</h2>
                      <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-6 py-2.5 bg-[#2B4EFF] text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-[#1a35d9] transition-colors"
                      >
                        მთავარ გვერდზე დაბრუნება
                      </button>
                    </div>
                  </Route>
                </Switch>
              </Suspense>
            </main>

          <Footer />
        </div>
          </LocalizedForms>
      </DialogProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

