'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users,
  Briefcase,
  X,
  AlertTriangle,
  Contact,
  ClipboardList,
  Files,
  CheckSquare,
  MousePointerClick,
  HardHat,
  FileBadge,
  ClipboardCheck
} from 'lucide-react';
import styles from './Sidebar.module.css';
import Logo from './Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.logoContainer}>
        <Link href="/" className={styles.logoLink} onClick={onClose}>
          <div className={styles.logoIcon}>
            <Logo size={42} />
          </div>
          <span className={styles.logoText}>RSDesign</span>
        </Link>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.navSection}>
        <nav>
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.path}
              className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
              onClick={onClose}
            >
              <item.icon size={18} className={styles.icon} />
              <span className={styles.itemName}>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Projects', icon: Briefcase, path: '/projects' },
  { name: 'Site Visits', icon: HardHat, path: '/site-visits' },
  { name: 'Requirements', icon: ClipboardList, path: '/requirements' },
  { name: 'Checklists', icon: CheckSquare, path: '/checklists' },
  { name: 'Selections', icon: MousePointerClick, path: '/selections' },
  { name: 'Vendors', icon: Contact, path: '/vendors' },
  { name: 'Quotations', icon: FileBadge, path: '/quotations' },
  { name: 'Audits', icon: ClipboardCheck, path: '/audits' },
  { name: 'Users', icon: Users, path: '/users' },
  { name: 'Deficiencies', icon: AlertTriangle, path: '/deficiencies' },
  { name: 'Directory', icon: Contact, path: '/directory' },
  { name: 'MOM', icon: ClipboardList, path: '/mom' },
  { name: 'Documents', icon: Files, path: '/documents' },
];
