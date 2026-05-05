// contexts/AuthContext.tsx
'use client';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define which routes require authentication
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/settings'];
const PUBLIC_ROUTES = ['/signin', '/signup', '/', '/logout'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize auth state
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    setUsername(storedUsername);
    setIsLoading(false);
  }, []);

  // Check route protection
  useEffect(() => {
    if (isLoading) return;

    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    // If user is not authenticated and trying to access protected route
    if (isProtectedRoute && !username) {
      router.push('/signin');
      return;
    }

    // // If user is authenticated and on signin page, redirect to dashboard
    // if (username && pathname === '/signin') {
    //   router.push('/dashboard');
    //   return;
    // }
  }, [username, pathname, router, isLoading]);

  const login = (newUsername: string) => {
    localStorage.setItem('username', newUsername);
    setUsername(newUsername);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('username');
    setUsername(null);
    router.push('/signin');
  };

  const value = {
    username,
    isAuthenticated: !!username,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
