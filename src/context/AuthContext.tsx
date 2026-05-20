'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  projectName?: string;
  projectId?: string;
  projectCode?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for user session
    const savedUser = localStorage.getItem('rs_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Protected routes check
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        if (user.role === 'Client') {
          router.push('/website');
        } else {
          router.push('/');
        }
      } else if (user && user.role === 'Client' && pathname !== '/website') {
        // Restrict client strictly to the client website
        router.push('/website');
      }
    }
  }, [user, pathname, isLoading, router]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('rs_user', JSON.stringify(userData));
    if (userData.role === 'Client') {
      router.push('/website');
    } else {
      router.push('/');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rs_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
