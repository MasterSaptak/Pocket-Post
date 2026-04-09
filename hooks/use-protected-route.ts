'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';

interface UseProtectedRouteOptions {
  /** Redirect to this path if not authenticated. Defaults to '/auth/signin' */
  redirectTo?: string;
  /** Required roles to access the route. If empty, any authenticated user can access. */
  requiredRoles?: UserRole[];
  /** Where to redirect if user lacks the required role. Defaults to '/' */
  unauthorizedRedirect?: string;
}

/**
 * Hook that guards routes behind authentication.
 * Redirects unauthenticated users to the sign-in page.
 * Optionally enforces role-based access control.
 */
export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const {
    redirectTo = '/auth/signin',
    requiredRoles = [],
    unauthorizedRedirect = '/',
  } = options;

  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRoles.length > 0 && profile) {
      if (!requiredRoles.includes(profile.role) && profile.role !== 'PRIME_ADMIN') {
        router.replace(unauthorizedRedirect);
      }
    }
  }, [user, profile, loading, router, redirectTo, requiredRoles, unauthorizedRedirect]);

  return {
    user,
    profile,
    loading,
    isAuthorized:
      !loading &&
      !!user &&
      (requiredRoles.length === 0 || (!!profile && (requiredRoles.includes(profile.role) || profile.role === 'PRIME_ADMIN'))),
  };
}
