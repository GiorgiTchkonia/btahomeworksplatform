import React from 'react';
import { Redirect } from 'wouter';
import { User, UserRole } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ user, allowedRoles, children }: ProtectedRouteProps) {
  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'STUDENT') return <Redirect to="/student" />;
    if (user.role === 'TEACHER') return <Redirect to="/teacher" />;
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
