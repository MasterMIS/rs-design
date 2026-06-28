'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import styles from './SearchableSelect.module.css';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  name?: string;
  icon?: React.ReactNode;
}

export default function SearchableSelect({ options, value, onChange, placeholder, name, icon }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container} ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} />}
      {icon && (
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.7, pointerEvents: 'none', zIndex: 10 }}>
          {icon}
        </div>
      )}
      <div 
        className={`${styles.selectBox} ${isOpen ? styles.selectBoxActive : ''} ${icon ? styles.withIcon : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? styles.value : styles.placeholder}>
          {value || placeholder}
        </span>
        <ChevronDown size={18} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <ul className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option}
                  className={`${styles.option} ${value === option ? styles.optionSelected : ''}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span>{option}</span>
                  {value === option && <Check size={16} className={styles.checkIcon} />}
                </li>
              ))
            ) : (
              <li className={styles.noOptions}>No results found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
