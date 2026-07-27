'use client';

import React from 'react';
import styles from '../website.module.css';

export function ClientFooter() {
  return (
    <footer className={styles.clientFooter}>
      <div className={styles.clientFooterInner}>
        <div>
          <strong>Ramesh Singhal Design</strong>
          <p>Architecture &amp; Interior · Client Project Portal</p>
        </div>
        <p className={styles.clientFooterCopy}>
          © {new Date().getFullYear()} Ramesh Singhal Design. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
