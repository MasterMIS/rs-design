'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Maximize, 
  Moon, 
  Sun, 
  LogOut,
  User as UserIcon,
  Globe
} from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import Logo from './Logo';

export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { user, logout } = useAuth();
  const { activeProject } = useProject();
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/projects" className={styles.logoLink}>
          <div className={styles.logoImageContainer}>
            <img 
              src="/logo.png" 
              alt="RSDesign Logo" 
              className={styles.companyLogoImage}
            />
          </div>
          <div className={styles.logoTextContainer}>
            <span className={styles.logoText}>Ramesh Singhal Design</span>
            <span className={styles.logoSubtitle}>Architecture & Design</span>
          </div>
        </Link>
      </div>

      <div className={styles.center}>
      </div>

      <div className={styles.right}>
        {user?.role !== 'Client' && (
          <button 
            type="button"
            onClick={() => router.push('/website')} 
            className={styles.viewWebsiteBtn}
            title="Preview Client Website"
          >
            <Globe size={18} />
            <span className={styles.hideMobile}>Client Website</span>
          </button>
        )}
        
        <div className={`${styles.iconButton} ${styles.hideMobile}`} onClick={toggleFullScreen}>
          <Maximize size={22} />
        </div>
        
        <div className={styles.iconButton} onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </div>
        
        <div className={styles.userProfileInline}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className={styles.avatarInline} referrerPolicy="no-referrer" />
          ) : (
            <div className={styles.avatarPlaceholder}><UserIcon size={20} /></div>
          )}
          <div className={`${styles.userInfo} ${styles.hideMobile}`}>
            <span className={styles.userName}>{user?.name || 'Guest'}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
          <button className={styles.logoutBtnInline} onClick={logout} title="Logout">
            <LogOut size={18} />
            <span className={styles.hideMobile}>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
