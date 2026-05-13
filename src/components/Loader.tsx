'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Loader.module.css';

interface LoaderProps {
  size?: number;
  className?: string;
  text?: string;
}

export default function Loader({ size = 24, className = '', text }: LoaderProps) {
  return (
    <div className={`${styles.loaderWrapper} ${className}`}>
      <Loader2 size={size} className={styles.spinner} />
      {text && <span className={styles.loaderText}>{text}</span>}
    </div>
  );
}
