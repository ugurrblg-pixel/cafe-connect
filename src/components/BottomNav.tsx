import { cn } from '@/lib/utils';
import { MapPin, MessageSquare, User, Bell, Users, Radar } from 'lucide-react';
import { useActivitiesAvailability } from '@/hooks/useActivitiesAvailability';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { useI18n } from '@/contexts/I18nContext';

type NavKey = 'discover' | 'notifications' | 'messages' | 'profile' | 'activities';

const navItems: Array<{
  path: string;
  icon: typeof MapPin;
  labelKey: NavKey;
  countKey: 'waves' | 'messages' | null;
}> = [
  { path: '/', icon: Radar, labelKey: 'discover', countKey: null },
  { path: '/notifications', icon: Bell, labelKey: 'notifications', countKey: 'waves' },
  { path: '/messages', icon: MessageSquare, labelKey: 'messages', countKey: 'messages' },
  { path: '/profile', icon: User, labelKey: 'profile', countKey: null },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { unreadCounts, resetUnreadCount } = useNotifications();
  const activities = useActivitiesAvailability();
  const items = activities.data === true ? navItems.map(item => item.path === '/notifications'
    ? {path:'/activities',icon:Users,labelKey:'activities' as const,countKey:null} : item) : navItems;

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
    <nav aria-label="Ana gezinme"
      className="riyo-dock fixed inset-x-0 bottom-0 z-50 px-3"
    >
      <div className="riyo-dock-surface mx-auto flex max-w-md items-center gap-1 p-1.5">
        {items.map(({ path, icon: Icon, labelKey, countKey }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));
          const count = countKey ? unreadCounts[countKey] : 0;
          const label = labelKey === 'discover' ? 'Radar' : labelKey === 'activities' ? 'Aktiviteler' : t.nav[labelKey];
          
          return (
            <button
              key={path}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handleNavClick(path, countKey)}
              className={cn(
                'riyo-dock-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2',
                isActive && 'riyo-dock-selected'
              )}
            >
              <div className="relative flex h-6 w-9 items-center justify-center">
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.5} />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] riyo-dock-count text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="max-w-full truncate text-[11px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
