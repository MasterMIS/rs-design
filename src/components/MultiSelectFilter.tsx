import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import styles from './MultiSelectFilter.module.css';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

export default function MultiSelectFilter({ label, options, selectedValues, onChange }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Ensure options are unique and clean
  const uniqueOptions = Array.from(new Set(options.filter(Boolean)));
  
  const filteredOptions = uniqueOptions.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === uniqueOptions.length) {
      onChange([]);
    } else {
      onChange([...uniqueOptions]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button 
        className={`${styles.triggerBtn} ${selectedValues.length > 0 ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={selectedValues.length > 0 ? selectedValues.join(', ') : label}
      >
        <span className={styles.label}>
          {selectedValues.length > 0 ? selectedValues.join(', ') : label}
        </span>
        {selectedValues.length > 0 && (
          <span className={styles.badge}>{selectedValues.length}</span>
        )}
        <ChevronDown size={14} className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`} />
        
        {selectedValues.length > 0 && (
          <div className={styles.clearBtn} onClick={clearSelection}>
            <X size={14} />
          </div>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
          </div>
          
          <div className={styles.optionsList}>
            <label className={styles.optionLabel}>
              <input 
                type="checkbox" 
                checked={selectedValues.length === uniqueOptions.length && uniqueOptions.length > 0}
                onChange={handleSelectAll}
                className={styles.checkbox}
              />
              <span className={styles.optionText} style={{ fontWeight: 600 }}>Select All</span>
            </label>
            
            {filteredOptions.length === 0 ? (
              <div className={styles.noResults}>No options found</div>
            ) : (
              filteredOptions.map((option, idx) => (
                <label key={idx} className={styles.optionLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleOption(option)}
                    className={styles.checkbox}
                  />
                  <span className={styles.optionText}>{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
