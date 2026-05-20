'use client';

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight, Building, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'internal' | 'client'>('internal');
  
  // Internal User inputs
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  // Client inputs
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
        : { loginType, projectName, projectCode };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.bgOverlay} />
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logoWrapper}>
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_X4IywFdVmR8DJ3LbFpDDPcq5gHv-_4MLqA&s" 
              alt="RSDesign Logo" 
              className={styles.companyLogo}
            />
          </div>
          <p>Interior & Architectural Design Solutions</p>
        </div>

        {/* Beautiful Modern Portal Selector Tabs */}
        <div className={styles.tabsContainer}>
          <button 
            type="button" 
            className={`${styles.tabBtn} ${loginType === 'internal' ? styles.activeTab : ''}`}
            onClick={() => { setLoginType('internal'); setError(null); }}
          >
            <User size={15} />
            <span>Company Staff</span>
          </button>
          <button 
            type="button" 
            className={`${styles.tabBtn} ${loginType === 'client' ? styles.activeTab : ''}`}
            onClick={() => { setLoginType('client'); setError(null); }}
          >
            <Building size={15} />
            <span>Client Portal</span>
          </button>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          {loginType === 'internal' ? (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Full Name</label>
                <div className={styles.inputWrapper}>
                  <User size={18} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    id="name" 
                    placeholder="Enter your name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="projectName">Project Name</label>
                <div className={styles.inputWrapper}>
                  <Building size={18} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    id="projectName" 
                    placeholder="Enter associated project name" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="projectCode">Project Security Code</label>
                <div className={styles.inputWrapper}>
                  <Key size={18} className={styles.inputIcon} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="projectCode" 
                    placeholder="Enter project passcode" 
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className={styles.formOptions}>
            <label className={styles.checkboxWrapper}>
              <input type="checkbox" />
              <span>Remember session</span>
            </label>
            <a href="#" className={styles.forgotPass}>Need Help?</a>
          </div>

          <button 
            type="submit" 
            className={styles.loginBtn} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>© 2026 RSDesign. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
