import { usePremiumContext } from '@/contexts/PremiumContext';

// Re-export the hook from context for backward compatibility
export function usePremium() {
  return usePremiumContext();
}

// Re-export types
export type { Subscription, PremiumFeatures } from '@/contexts/PremiumContext';
