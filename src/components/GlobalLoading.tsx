'use client';

import React from 'react';
import Loader from './Loader';
import styles from './GlobalLoading.module.css';

interface GlobalLoadingProps {
  show: boolean;
  text?: string;
}

export default function GlobalLoading({ show, text = 'Processing...' }: GlobalLoadingProps) {
  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.loadingCard}>
        <Loader size={40} text={text} />
      </div>
    </div>
  );
}
