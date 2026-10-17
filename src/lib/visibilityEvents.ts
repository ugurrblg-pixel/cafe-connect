export const VISIBILITY_CHANGED = 'riyo:visibility-changed';
export function invalidateVisibleProfiles() { window.dispatchEvent(new Event(VISIBILITY_CHANGED)); }
