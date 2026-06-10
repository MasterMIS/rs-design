'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import Loader from './Loader';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const isLoginPage = pathname === '/login';
  const isWebsitePage = pathname === '/website';

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size={48} text="Authenticating..." />
      </div>
    );
  }

  // If login page or client website page, bypass standard admin frame
  if (isLoginPage || isWebsitePage) {
    return <div className="no-layout">{children}</div>;
  }

  if (!user) return null;

  return (
    <div className="layout-wrapper">
      <div className="main-content">
        <Header />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
