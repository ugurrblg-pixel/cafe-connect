import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UnreadCounts {
  waves: number;
  messages: number;
}

interface UsePushNotificationsReturn {
  isSubscribed: boolean;
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  unreadCounts: UnreadCounts;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  resetUnreadCount: (type: 'waves' | 'messages' | 'all') => Promise<void>;
  refetchCounts: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ waves: 0, messages: 0 });

  const isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  // Fetch unread counts
  const refetchCounts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('unread_counts')
      .select('waves, messages')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setUnreadCounts({ waves: data.waves, messages: data.messages });
    }
  }, [user]);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported || !user) return;

    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Check if subscription exists in database
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();

        setIsSubscribed(!!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [isSupported, user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      toast.error('Push notifications are not supported');
      return false;
    }

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Bildirim izni verilmedi');
        return false;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        // Still allow in-app notifications even without VAPID
        toast.success('Uygulama içi bildirimler aktif');
        return true;
      }

      // Register service worker if not already
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
          platform: 'web',
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        toast.error('Bildirim kaydı başarısız');
        return false;
      }

      setIsSubscribed(true);
      toast.success('Bildirimler aktif! 🔔');
      return true;

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Bildirim kaydı başarısız');
      return false;
    }
  }, [isSupported, user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) return false;

    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration & { pushManager: PushManager };
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Bildirimler kapatıldı');
      return true;

    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [isSupported, user]);

  // Reset unread count
  const resetUnreadCount = useCallback(async (type: 'waves' | 'messages' | 'all') => {
    if (!user) return;

    const { error } = await supabase.rpc('reset_unread_count', {
      target_user_id: user.id,
      count_type: type,
    });

    if (!error) {
      setUnreadCounts(prev => ({
        waves: type === 'waves' || type === 'all' ? 0 : prev.waves,
        messages: type === 'messages' || type === 'all' ? 0 : prev.messages,
      }));
    }
  }, [user]);

  // Initialize
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, [isSupported]);

  useEffect(() => {
    if (user) {
      checkSubscription();
      refetchCounts();
    }
  }, [user, checkSubscription, refetchCounts]);

  // Real-time subscription for unread counts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread-counts-${user.id}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unread_counts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as { waves: number; messages: number };
            setUnreadCounts({ waves: data.waves, messages: data.messages });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    isSubscribed,
    isSupported,
    permission,
    unreadCounts,
    subscribe,
    unsubscribe,
    resetUnreadCount,
    refetchCounts,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}
