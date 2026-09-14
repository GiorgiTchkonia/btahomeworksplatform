import React, { useState, useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import Navbar from './components/Navbar';
import LoginPage from './pages_view/LoginPage';
import TeacherDashboardPage from './pages_view/TeacherDashboardPage';
import TeacherAssignmentDetailsPage from './pages_view/TeacherAssignmentDetailsPage';
import StudentDashboardPage from './pages_view/StudentDashboardPage';
import WhitelistPage from './pages_view/WhitelistPage';
import AdminDashboardPage from './pages_view/AdminDashboardPage';
import { User } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (error || !profile) {
        setUser(null);
      } else {
        setUser(profile as User);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
    
    // Subscribe to auth state changes (e.g. login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkUser();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar user={user} onLogout={() => setUser(null)} onUserUpdated={(u) => setUser(u)} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Switch>
          <Route path="/">
            {() => {
              if (!user) return <LoginPage onLoginSuccess={checkUser} />;
              if (user.role === 'ADMIN') return <AdminDashboardPage />;
              if (user.role === 'TEACHER') return <TeacherDashboardPage />;
              return <StudentDashboardPage />;
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
            {() => {
              if (!user) return <Redirect to="/login" />;
              if (user.role !== 'ADMIN') return <Redirect to="/" />;
              return <AdminDashboardPage />;
            }}
          </Route>

          <Route path="/teacher">
            {() => {
              if (!user) return <Redirect to="/login" />;
              if (user.role !== 'TEACHER') return <Redirect to="/" />;
              return <TeacherDashboardPage />;
            }}
          </Route>

          <Route path="/teacher/assignments/:id">
            {() => {
              if (!user) return <Redirect to="/login" />;
              if (user.role !== 'TEACHER') return <Redirect to="/" />;
              return <TeacherAssignmentDetailsPage />;
            }}
          </Route>

          <Route path="/student">
            {() => {
              if (!user) return <Redirect to="/login" />;
              if (user.role !== 'STUDENT') return <Redirect to="/" />;
              return <StudentDashboardPage />;
            }}
          </Route>

          <Route path="/whitelist">
            {() => <WhitelistPage onLoginSuccess={checkUser} />}
          </Route>

          {/* 404 Fallback */}
          <Route>
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-slate-800">გვერდი არ მოიძებნა (404)</h2>
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
              >
                მთავარ გვერდზე დაბრუნება
              </button>
            </div>
          </Route>
        </Switch>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium">აკადემიის საშინაო დავალებების პორტალი &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
