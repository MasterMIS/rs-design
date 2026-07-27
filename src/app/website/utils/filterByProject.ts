export function matchesProject(
  itemProject: string | undefined,
  selectedProjectName: string
): boolean {
  if (!selectedProjectName?.trim()) return false;
  return (
    itemProject?.trim().toLowerCase() === selectedProjectName.trim().toLowerCase()
  );
}

export function filterByProject<T extends { project?: string }>(
  items: T[],
  selectedProjectName: string
): T[] {
  return items.filter((item) => matchesProject(item.project, selectedProjectName));
}
