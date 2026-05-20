'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import Loader from './Loader';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  
  const isLoginPage = pathname === '/login';
  const isWebsitePage = pathname === '/website';

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

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

  // If not logged in and not on login page, the AuthContext will handle redirect.
  // We can show nothing or a small loader while redirecting.
  if (!user) return null;

  return (
    <div className="layout-wrapper">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
        onClick={closeSidebar}
      />

      <div className="main-content">
        <Header toggleSidebar={toggleSidebar} />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
