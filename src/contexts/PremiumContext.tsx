import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'inactive';
  started_at: string | null;
  expires_at: string | null;
}

export interface PremiumFeatures {
  unlimitedChats: boolean;
  profileViews: boolean;
  hideLastSeen: boolean;
  seeLastSeen: boolean;
  readReceipts: boolean;
  boostProfile: boolean;
  deleteForBoth: boolean;
  extendedRadius: boolean;
  priorityVisibility: boolean;
}

interface PremiumContextType {
  subscription: Subscription | null;
  isPremium: boolean;
  features: PremiumFeatures;
  dailyChatCount: number;
  remainingChats: number;
  canStartChat: boolean;
  loading: boolean;
  incrementChatCount: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  FREE_CHAT_LIMIT: number;
}

const FREE_CHAT_LIMIT = 3;

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyChatCount, setDailyChatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const features: PremiumFeatures = {
    unlimitedChats: isPremium,
    profileViews: isPremium,
    hideLastSeen: isPremium,
    seeLastSeen: isPremium,
    readReceipts: isPremium,
    boostProfile: isPremium,
    deleteForBoth: isPremium,
    extendedRadius: isPremium,
    priorityVisibility: isPremium,
  };

  const remainingChats = isPremium ? Infinity : Math.max(0, FREE_CHAT_LIMIT - dailyChatCount);
  const canStartChat = isPremium || dailyChatCount < FREE_CHAT_LIMIT;

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsPremium(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const sub = data as Subscription;
        setSubscription(sub);
        
        // Check if premium is active
        const isActive = sub.status === 'active' && 
          (!sub.expires_at || new Date(sub.expires_at) > new Date());
        setIsPremium(isActive);
      } else {
        setSubscription(null);
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setIsPremium(false);
    }
  }, [user]);

  const fetchDailyChatCount = useCallback(async () => {
    if (!user) {
      setDailyChatCount(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_daily_chat_starts', {
        target_user_id: user.id
      });

      if (error) throw error;
      setDailyChatCount(data || 0);
    } catch (error) {
      console.error('Error fetching daily chat count:', error);
    }
  }, [user]);

  const incrementChatCount = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    // Premium users can always start chats
    if (isPremium) return true;

    // Check if at limit
    if (dailyChatCount >= FREE_CHAT_LIMIT) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('increment_chat_starts', {
        target_user_id: user.id
      });

      if (error) throw error;
      setDailyChatCount(data || dailyChatCount + 1);
      return true;
    } catch (error) {
      console.error('Error incrementing chat count:', error);
      return false;
    }
  }, [user, isPremium, dailyChatCount]);

  const refreshSubscription = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSubscription(), fetchDailyChatCount()]);
    setLoading(false);
  }, [fetchSubscription, fetchDailyChatCount]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <PremiumContext.Provider value={{
      subscription,
      isPremium,
      features,
      dailyChatCount,
      remainingChats,
      canStartChat,
      loading,
      incrementChatCount,
      refreshSubscription,
      FREE_CHAT_LIMIT,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremiumContext() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremiumContext must be used within a PremiumProvider');
  }
  return context;
}
