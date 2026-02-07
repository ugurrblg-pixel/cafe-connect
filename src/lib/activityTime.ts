/**
 * Activity time constants
 */
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Format the last active time as a human-readable string
 * Returns "Active now" for recent activity, "Last seen Xm ago" for older
 */
export function formatLastActive(lastActiveAt: Date | undefined): string {
  if (!lastActiveAt) return 'Active now';

  const now = Date.now();
  const lastActive = lastActiveAt.getTime();
  const diffMs = now - lastActive;

  // Within active threshold
  if (diffMs < ACTIVE_THRESHOLD_MS) {
    return 'Active now';
  }

  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `Last seen ${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `Last seen ${diffHours}h ago`;
    }
    return 'Last seen >1d ago';
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
    return { label: 'Active now', isActive: true, urgency: 'active' };
  }

  const now = Date.now();
  const diffMs = now - lastActiveAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMs < ACTIVE_THRESHOLD_MS) {
    return { label: 'Active now', isActive: true, urgency: 'active' };
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
 * Determine if user is considered "active" (within last 5 minutes)
 */
export function isActiveNow(lastActiveAt: Date | undefined): boolean {
  if (!lastActiveAt) return true; // Assume active if no data

  const now = Date.now();
  const diffMs = now - lastActiveAt.getTime();

  return diffMs < ACTIVE_THRESHOLD_MS;
}
