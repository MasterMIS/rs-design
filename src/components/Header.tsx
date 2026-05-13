'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Maximize, 
  Moon, 
  Sun, 
  ChevronDown,
  LayoutDashboard,
  Users as UsersIcon,
  Menu,
  LogOut,
  User as UserIcon,
  Settings
} from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';

const pages = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Users', path: '/users', icon: UsersIcon },
];

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof pages>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      const filtered = pages.filter(page => 
        page.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    }
  }, [searchQuery]);

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

  const handlePageSelect = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        
        <div className={styles.searchContainer} ref={searchRef}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search pages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
            />
          </div>
          
          {isSearchFocused && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((page) => (
                <div 
                  key={page.name} 
                  className={styles.resultItem}
                  onClick={() => handlePageSelect(page.path)}
                >
                  <page.icon size={16} />
                  <span>{page.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.right}>
        <div className={`${styles.iconButton} ${styles.hideMobile}`} onClick={toggleFullScreen}>
          <Maximize size={20} />
        </div>
        
        <div className={styles.iconButton} onClick={toggleTheme}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </div>
        
        <div className={styles.userProfileWrapper} ref={profileRef}>
          <div className={styles.userProfile} onClick={() => setIsProfileOpen(!isProfileOpen)}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              <div className={styles.avatarPlaceholder}><UserIcon size={20} /></div>
            )}
            <div className={`${styles.userInfo} ${styles.hideMobile}`}>
              <span className={styles.userName}>{user?.name || 'Guest'}</span>
              <ChevronDown size={14} className={isProfileOpen ? styles.chevronUp : ''} />
            </div>
          </div>

          {isProfileOpen && (
            <div className={styles.profileDropdown}>
              <div className={styles.dropdownHeader}>
                <p className={styles.dropdownName}>{user?.name}</p>
                <p className={styles.dropdownRole}>{user?.role}</p>
              </div>
              <div className={styles.dropdownBody}>
                <button className={styles.dropdownItem}>
                  <UserIcon size={16} />
                  <span>My Profile</span>
                </button>
                <button className={styles.dropdownItem}>
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
              </div>
              <div className={styles.dropdownFooter}>
                <button className={`${styles.dropdownItem} ${styles.logoutBtn}`} onClick={logout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
