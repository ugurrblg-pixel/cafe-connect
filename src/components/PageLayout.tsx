import { useActiveCheckIn } from '@/hooks/useActiveCheckIn';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds top padding when check-in status bar is visible
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  const { activeCheckIn } = useActiveCheckIn();
  const location = useLocation();

  // Status bar is hidden on these routes
  const hideStatusBar = 
    location.pathname.startsWith('/cafe/') || 
    location.pathname.startsWith('/chat/') ||
    location.pathname === '/auth';

  const hasStatusBar = activeCheckIn && !hideStatusBar;

  return (
    <div className={cn(hasStatusBar && 'pt-12', className)}>
      {children}
    </div>
  );
}
