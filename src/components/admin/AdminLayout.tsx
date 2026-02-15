import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Flag,
  ShieldCheck,
  MessageCircle,
  ScrollText,
  ChevronLeft,
  Receipt,
  TrendingUp,
  BadgeCheck,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  { label: 'Users', icon: Users, to: '/admin/users' },
  { label: 'Reports', icon: Flag, to: '/admin/reports' },
  { label: 'Moderation', icon: MessageCircle, to: '/admin/moderation' },
  { label: 'Doğrulama', icon: BadgeCheck, to: '/admin/verification' },
  { label: 'Abonelikler', icon: Receipt, to: '/admin/subscriptions' },
  { label: 'Genel Bakış', icon: TrendingUp, to: '/admin/revenue' },
  { label: 'Audit Log', icon: ScrollText, to: '/admin/audit-log' },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { role } = useAdminRole();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Admin Panel</span>
          </div>
          <span className="text-xs text-muted-foreground capitalize mt-1 block">{role}</span>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
