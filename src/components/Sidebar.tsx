'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ClipboardCheck,
  ArrowLeft
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useProject } from '@/context/ProjectContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProject, clearActiveProject } = useProject();

  const handleBackToProjects = () => {
    clearActiveProject();
    router.push('/projects');
    onClose();
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.projectHeader}>
        <button className={styles.backButton} onClick={handleBackToProjects}>
          <ArrowLeft size={18} />
          <span>Back to Projects</span>
        </button>
        {activeProject && (
          <div className={styles.activeProjectName}>
            {activeProject.name}
          </div>
        )}
      </div>
      <button className={styles.closeButtonMobile} onClick={onClose}>
        <X size={20} />
      </button>

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
  { name: 'Site Visits', icon: HardHat, path: '/site-visits' },
  { name: 'Requirements', icon: ClipboardList, path: '/requirements' },
  { name: 'Checklists', icon: CheckSquare, path: '/checklists' },
  { name: 'Selections', icon: MousePointerClick, path: '/selections' },
  { name: 'Quotations', icon: FileBadge, path: '/quotations' },
  { name: 'Audits', icon: ClipboardCheck, path: '/audits' },
  { name: 'Deficiencies', icon: AlertTriangle, path: '/deficiencies' },
  { name: 'Directory', icon: Contact, path: '/directory' },
  { name: 'MOM', icon: ClipboardList, path: '/mom' },
  { name: 'Documents', icon: Files, path: '/documents' },
];
