'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  LayoutDashboard,
  Layers,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './AppNavSidebar.module.css';

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNavSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'PC Dashboard', icon: Activity, href: '/pc-dashboard' },
    { name: 'Sales', icon: BarChart3, href: '/sales' },
    { name: 'EM', icon: Layers, href: '/em' },
    { name: 'HRMS', icon: Users, href: '/hrms' },
    ...(user?.role === 'Admin'
      ? [{ name: 'Users', icon: Users, href: '/users' }]
      : []),
    { name: 'Project Portfolio', icon: BriefcaseBusiness, href: '/projects' },
  ];

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              <item.icon size={18} className={styles.icon} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
