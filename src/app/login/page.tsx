'use client';

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, Building, Key, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'internal' | 'client'>('internal');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const payload = loginType === 'internal'
        ? { loginType, name, password }
        : { loginType, projectName };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      login(data.user);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.pageRoot}>

      {/* ─── LEFT PANEL ─── */}
      <div className={styles.leftPanel}>
        {/* Full-panel background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-building.png"
          alt="Architecture Illustration"
          className={styles.bgImage}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Dark gradient overlay for text readability */}
        <div className={styles.bgGradient} />

        {/* Grid overlay */}
        <div className={styles.gridOverlay} />

        {/* All text content overlaid on the image */}
        <div className={styles.leftContent}>

          {/* Top brand */}
          <div className={styles.leftBrand}>
            <div className={styles.leftBrandName}>Ramesh Singhal Design</div>
            <div className={styles.leftBrandTagline}>Architecture &amp; Interior</div>
            <div className={styles.leftBrandAccent} />
          </div>

          {/* Spacer pushes stats to bottom */}
          <div style={{ flex: 1 }} />

          {/* Bottom text + stats */}
          <div className={styles.leftBottom}>
            <div className={styles.leftTextBlock}>
              <h1 className={styles.leftHeading}>Design. Build.<br />Deliver Excellence.</h1>
              <p className={styles.leftSub}>
                Architectural project management, streamline workflows,
                manage teams and optimize resources — all in one unified platform.
              </p>
            </div>

            <div className={styles.leftStats}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>50+</span>
                <span className={styles.statLabel}>Projects</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>12+</span>
                <span className={styles.statLabel}>Modules</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statNum}>100%</span>
                <span className={styles.statLabel}>Secure</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>

          {/* Logo */}
          <div className={styles.formLogoRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="RSDesign" className={styles.formLogo} />
          </div>

          <div className={styles.formHeading}>
            <h2>Welcome Back 👋</h2>
            <p>Sign in to your account to continue</p>
          </div>

          {/* Tab Switcher */}
          <div className={styles.tabRow}>
            <button
              type="button"
              className={`${styles.tabPill} ${loginType === 'internal' ? styles.tabActive : ''}`}
              onClick={() => { setLoginType('internal'); setError(null); }}
            >
              <User size={14} /> Company Staff
            </button>
            <button
              type="button"
              className={`${styles.tabPill} ${loginType === 'client' ? styles.tabActive : ''}`}
              onClick={() => { setLoginType('client'); setError(null); }}
            >
              <Building size={14} /> Client Portal
            </button>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit}>
            {loginType === 'internal' ? (
              <>
                <div className={styles.fieldGroup}>
                  <label htmlFor="name">Full Name</label>
                  <div className={styles.inputBox}>
                    <User size={16} className={styles.inputIcon} />
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.inputBox}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.fieldGroup}>
                  <label htmlFor="projectName">Project Name</label>
                  <div className={styles.inputBox}>
                    <Building size={16} className={styles.inputIcon} />
                    <input
                      id="projectName"
                      type="text"
                      placeholder="Enter your project name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className={styles.formMeta}>
              <label className={styles.rememberLabel}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className={styles.helpLink}>Need Help?</a>
            </div>

            <button type="submit" className={styles.signInBtn} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 size={18} className={styles.spinner} /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className={styles.formFooter}>
            <p>© 2026 Ramesh Singhal Design. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
