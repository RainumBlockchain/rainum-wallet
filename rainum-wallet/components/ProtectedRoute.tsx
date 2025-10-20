/**
 * Protected Route Component
 * Client-side route protection with loading state
 *
 * Wraps dashboard pages to ensure user is authenticated before rendering
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth-flow';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route wrapper component
 * Shows loading screen while validating session
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Validate authentication on mount
    async function validateAuth() {
      setIsValidating(true);

      // Check if user has valid session
      const authenticated = isAuthenticated();

      if (!authenticated) {
        // Not authenticated - redirect to login
        const currentPath = window.location.pathname;
        router.replace(`/?redirectTo=${encodeURIComponent(currentPath)}`);
      } else {
        // Authenticated - allow access
        setIsAuthorized(true);
      }

      setIsValidating(false);
    }

    validateAuth();
  }, [router]);

  // Show loading screen while validating
  if (isValidating) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          {/* Animated spinner */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#0019ff] border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* Loading text */}
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Validating Session
          </h2>
          <p className="text-sm text-gray-500">
            Please wait while we verify your authentication...
          </p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authorized (redirect happens in useEffect)
  if (!isAuthorized) {
    return null;
  }

  // User is authenticated - render protected content
  return <>{children}</>;
}
