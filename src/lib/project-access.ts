export type ProjectWithTeam = {
  id?: string;
  basicInfo?: { name?: string };
  team?: Array<{ name?: string; isActive?: string }>;
};

export type AuthUser = {
  name: string;
  role: string;
  projectId?: string;
  projectName?: string;
} | null;

/** Admin and manager-level roles that can see every project */
export const ALL_PROJECTS_ROLES = ['Admin', 'PC', 'EA', 'Manager'];

export function canViewAllProjects(role: string | undefined | null): boolean {
  return !!role && ALL_PROJECTS_ROLES.includes(role);
}

export function isUserOnProjectTeam(
  team: ProjectWithTeam['team'],
  userName: string | undefined
): boolean {
  if (!userName?.trim()) return false;
  const normalized = userName.trim().toLowerCase();
  return (team ?? []).some(
    (member) =>
      member.name?.trim().toLowerCase() === normalized &&
      member.isActive !== 'No'
  );
}

export function filterProjectsForUser<T extends ProjectWithTeam>(
  projects: T[],
  user: AuthUser
): T[] {
  if (!user) return [];
  if (canViewAllProjects(user.role)) return projects;

  if (user.role === 'Client') {
    if (user.projectId) {
      return projects.filter((project) => project.id === user.projectId);
    }
    if (user.projectName) {
      return projects.filter(
        (project) => project.basicInfo?.name === user.projectName
      );
    }
    return [];
  }

  return projects.filter((project) =>
    isUserOnProjectTeam(project.team, user.name)
  );
}
