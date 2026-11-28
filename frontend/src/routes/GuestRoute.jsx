import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function GuestRoute({ children }) {
  const { isAuthenticated, isAdmin, loading, hasSessionHint } = useAuth();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/shop';
  const safeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/shop';

  if (loading && hasSessionHint) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-4">
        <Skeleton className="h-14 w-14 rounded-full mx-auto" />
        <Skeleton className="h-8 w-56 mx-auto" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : safeRedirect} replace />;
  }

  return children;
}
