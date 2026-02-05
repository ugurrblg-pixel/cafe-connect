import { cn } from '@/lib/utils';
import { MapPin, MessageSquare, User, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: MapPin, label: 'Discover' },
  { path: '/notifications', icon: Bell, label: 'Waves' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show on cafe room pages
  if (location.pathname.startsWith('/cafe/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-effect border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'nav-item flex-1',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
