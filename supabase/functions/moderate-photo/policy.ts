export type PhotoVerdict = 'accepted' | 'rejected' | 'pending';
const imageCategories = ['sexual', 'violence', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions'];
export function photoVerdict(result: unknown): PhotoVerdict {
  if (!result || typeof result !== 'object') return 'pending';
  const value = result as { flagged?: unknown; categories?: Record<string, unknown> };
  if (typeof value.flagged !== 'boolean' || !value.categories
    || imageCategories.some(key => typeof value.categories![key] !== 'boolean')) return 'pending';
  return value.flagged || imageCategories.some(key => value.categories![key] === true) ? 'rejected' : 'accepted';
}
