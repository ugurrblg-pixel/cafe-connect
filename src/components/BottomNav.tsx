import { cn } from '@/lib/utils';
import { MapPin, MessageSquare, User, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const navItems = [
  { path: '/', icon: MapPin, label: 'Discover', countKey: null },
  { path: '/notifications', icon: Bell, label: 'Waves', countKey: 'waves' as const },
  { path: '/messages', icon: MessageSquare, label: 'Messages', countKey: 'messages' as const },
  { path: '/profile', icon: User, label: 'Profile', countKey: null },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCounts, resetUnreadCount } = usePushNotifications();

  // Don't show on cafe room or chat pages
  if (location.pathname.startsWith('/cafe/') || location.pathname.startsWith('/chat/')) {
    return null;
  }

  const handleNavClick = async (path: string, countKey: 'waves' | 'messages' | null) => {
    navigate(path);
    // Reset count when navigating to that section
    if (countKey) {
      await resetUnreadCount(countKey);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, label, countKey }) => {
          const isActive = location.pathname === path;
          const count = countKey ? unreadCounts[countKey] : 0;
          
          return (
            <button
              key={path}
              onClick={() => handleNavClick(path, countKey)}
              className={cn(
                'nav-item flex-1 relative',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
