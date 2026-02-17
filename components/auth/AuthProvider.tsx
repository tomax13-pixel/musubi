'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { type User } from 'firebase/auth';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (!user && !isPublic) {
      router.push('/login');
    } else if (user && isPublic) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
