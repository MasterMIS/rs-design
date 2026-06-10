'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ActiveProject {
  id: string;
  name: string;
}

interface ProjectContextType {
  activeProject: ActiveProject | null;
  setActiveProject: (project: ActiveProject) => void;
  clearActiveProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<ActiveProject | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedProject = localStorage.getItem('activeProject');
    if (savedProject) {
      try {
        setActiveProjectState(JSON.parse(savedProject));
      } catch (e) {
        console.error('Failed to parse activeProject from localStorage', e);
      }
    }
    setIsInitialized(true);
  }, []);

  const setActiveProject = (project: ActiveProject) => {
    setActiveProjectState(project);
    localStorage.setItem('activeProject', JSON.stringify(project));
  };

  const clearActiveProject = () => {
    setActiveProjectState(null);
    localStorage.removeItem('activeProject');
  };

  // Prevent rendering children until localStorage is checked to avoid hydration mismatch
  if (!isInitialized) {
    return null;
  }

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProject, clearActiveProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
