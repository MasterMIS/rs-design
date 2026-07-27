'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useClientPortalData } from './hooks/useClientPortalData';
import { ClientHeader } from './components/ClientHeader';
import { ProjectHero } from './components/ProjectHero';
import { ModuleStatsRow } from './components/ModuleStatsRow';
import { ModulePanelRouter } from './components/ModulePanelRouter';
import { ClientFooter } from './components/ClientFooter';
import type { ClientModuleId } from './types';
import styles from './website.module.css';

export default function ClientWebsitePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ClientModuleId>('requirements');

  const {
    loading,
    selectedProjectName,
    setSelectedProjectName,
    projectsList,
    currentProject,
    progressPercent,
    moduleCounts,
    filtered,
    mergedDrawings,
    mergedTracker,
    trackerProgress,
    drawingProgress,
  } = useClientPortalData(user);

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loaderIcon}>
          <Sparkles className={styles.spinIcon} size={40} />
        </div>
        <p>Loading your client space...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.gradientBlurOne} />
      <div className={styles.gradientBlurTwo} />

      <ClientHeader
        user={user}
        projectsList={projectsList}
        selectedProjectName={selectedProjectName}
        onProjectChange={setSelectedProjectName}
        onLogout={logout}
      />

      <ProjectHero
        project={currentProject}
        projectName={selectedProjectName}
        progressPercent={progressPercent}
        trackerProgress={trackerProgress}
        drawingProgress={drawingProgress}
      />

      <ModuleStatsRow
        counts={moduleCounts}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      <main className={styles.contentPanel}>
        <ModulePanelRouter
          activeTab={activeTab}
          filtered={filtered}
          mergedDrawings={mergedDrawings}
          mergedTracker={mergedTracker}
        />
      </main>

      <ClientFooter />
    </div>
  );
}
