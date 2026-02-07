/**
 * Format the last active time as a human-readable string
 */
export function formatLastActive(lastActiveAt: Date | undefined): string {
  if (!lastActiveAt) return 'Active';

  const now = Date.now();
  const lastActive = lastActiveAt.getTime();
  const diffMs = now - lastActive;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Active now';
  } else if (diffMins < 5) {
    return 'Active now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  }
}

/**
 * Determine if user is considered "active" (within last 5 minutes)
 */
export function isActiveNow(lastActiveAt: Date | undefined): boolean {
  if (!lastActiveAt) return true; // Assume active if no data

  const now = Date.now();
  const lastActive = lastActiveAt.getTime();
  const diffMs = now - lastActive;
  const diffMins = Math.floor(diffMs / 60000);

  return diffMins < 5;
}
