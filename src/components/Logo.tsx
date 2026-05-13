'use client';

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 42, className = '' }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M0 85H80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M0 88H80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="15" y="45" width="10" height="35" fill="currentColor" fillOpacity="0.6" />
      <rect x="32" y="35" width="12" height="45" fill="currentColor" />
      <rect x="52" y="40" width="10" height="40" fill="currentColor" fillOpacity="0.4" />
      <path d="M10 65L40 20L75 55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M28 15V80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M48 10V80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
