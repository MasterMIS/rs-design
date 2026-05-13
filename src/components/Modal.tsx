'use client';

import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  type?: 'default' | 'danger';
}

export default function Modal({ isOpen, onClose, title, children, width, type = 'default' }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={`${styles.modal} ${type === 'danger' ? styles.dangerModal : ''}`} 
        onClick={(e) => e.stopPropagation()}
        style={width ? { maxWidth: width } : {}}
      >
        <div className={`${styles.header} ${type === 'danger' ? styles.dangerHeader : ''}`}>
          <div className={styles.headerTitle}>
            {type === 'danger' && <AlertCircle size={20} className={styles.dangerIcon} />}
            <h3>{title}</h3>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
