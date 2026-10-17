import { useEffect, createContext, useContext, ReactNode } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
