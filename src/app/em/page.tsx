'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, PenTool, Hammer, BarChart3 } from 'lucide-react';
import styles from './em.module.css';

export default function EMPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Engineering & Execution Management</h2>
          <div className="breadcrumbNav">
            <Link href="/">Dashboard</Link>
            <span className="separator">&gt;</span>
            <span className="current">EM</span>
          </div>
        </div>
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div className={styles.tilesContainer}>
        <Link href="/em/design" className={styles.tile}>
          <div className={styles.tileIcon}>
            <PenTool size={32} />
          </div>
          <div>
            <h3>Design</h3>
            <p>Manage Design Tasks & Drawings</p>
          </div>
        </Link>

        <Link href="/em/execution" className={styles.tile}>
          <div className={styles.tileIcon}>
            <Hammer size={32} />
          </div>
          <div>
            <h3>Execution</h3>
            <p>Manage Site Execution & Supervisors</p>
          </div>
        </Link>

        <Link href="/em/dashboard" className={styles.tile} style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
          <div className={styles.tileIcon}>
            <BarChart3 size={32} />
          </div>
          <div>
            <h3>EM Dashboard</h3>
            <p>Analytics & Key Performance Indicators</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
