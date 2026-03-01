import { cn } from '@/lib/utils';
import { MapPin, MessageSquare, User, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useI18n } from '@/contexts/I18nContext';

type NavKey = 'discover' | 'notifications' | 'messages' | 'profile';

const navItems: Array<{
  path: string;
  icon: typeof MapPin;
  labelKey: NavKey;
  countKey: 'waves' | 'messages' | null;
}> = [
  { path: '/', icon: MapPin, labelKey: 'discover', countKey: null },
  { path: '/notifications', icon: Bell, labelKey: 'notifications', countKey: 'waves' },
  { path: '/messages', icon: MessageSquare, labelKey: 'messages', countKey: 'messages' },
  { path: '/profile', icon: User, labelKey: 'profile', countKey: null },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { unreadCounts, resetUnreadCount } = usePushNotifications();

  // Don't show on cafe room or chat pages
  if (location.pathname.startsWith('/cafe/') || location.pathname.startsWith('/chat/')) {
    return null;
  }

  const handleNavClick = async (path: string, countKey: 'waves' | 'messages' | null) => {
    navigate(path);
    if (countKey) {
      await resetUnreadCount(countKey);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/40 safe-bottom z-50"
      style={{ boxShadow: '0 -1px 12px 0 hsl(18 30% 50% / 0.04)' }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, labelKey, countKey }) => {
          const isActive = location.pathname === path;
          const count = countKey ? unreadCounts[countKey] : 0;
          const label = t.nav[labelKey];
          
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
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.2 : 1.5} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
