import { useEffect, createContext, useContext, ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextValue {
  isSubscribed: boolean;
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  unreadCounts: { waves: number; messages: number };
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  resetUnreadCount: (type: 'waves' | 'messages' | 'all') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pushNotifications = usePushNotifications();

  // Register service worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Auto-prompt for notifications after user logs in (once)
  useEffect(() => {
    if (user && pushNotifications.isSupported && pushNotifications.permission === 'default') {
      // Don't auto-prompt, let user opt-in from profile settings
    }
  }, [user, pushNotifications.isSupported, pushNotifications.permission]);

  return (
    <NotificationContext.Provider value={pushNotifications}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
