/**
 * Activity time constants - 2 minute threshold for "Online" status
 */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Format the last active time as a human-readable string
 * Returns "Online" for activity within 2 minutes, "Active Xm ago" for older
 */
export function formatLastActive(lastActiveAt: Date | undefined): string {
  if (!lastActiveAt) return 'Online';

  const now = Date.now();
  const lastActive = lastActiveAt.getTime();
  const diffMs = now - lastActive;

  // Within online threshold
  if (diffMs < ONLINE_THRESHOLD_MS) {
    return 'Online';
  }

  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `Active ${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `Active ${diffHours}h ago`;
    }
    return 'Active >1d ago';
  }
}

/**
 * Get a short activity label for compact displays
 */
export function getActivityLabel(lastActiveAt: Date | undefined): { 
  label: string; 
  isActive: boolean;
  urgency: 'active' | 'recent' | 'stale';
} {
  if (!lastActiveAt) {
    return { label: 'Online', isActive: true, urgency: 'active' };
  }

  const now = Date.now();
  const diffMs = now - lastActiveAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMs < ONLINE_THRESHOLD_MS) {
    return { label: 'Online', isActive: true, urgency: 'active' };
  }

  if (diffMins < 15) {
    return { label: `${diffMins}m`, isActive: false, urgency: 'recent' };
  }

  if (diffMins < 60) {
    return { label: `${diffMins}m`, isActive: false, urgency: 'stale' };
  }

  const diffHours = Math.floor(diffMins / 60);
  return { label: `${diffHours}h`, isActive: false, urgency: 'stale' };
}

/**
 * Determine if user is considered "online" (within last 2 minutes)
 */
export function isActiveNow(lastActiveAt: Date | undefined): boolean {
  if (!lastActiveAt) return true; // Assume online if no data

  const now = Date.now();
  const diffMs = now - lastActiveAt.getTime();

  return diffMs < ONLINE_THRESHOLD_MS;
}
