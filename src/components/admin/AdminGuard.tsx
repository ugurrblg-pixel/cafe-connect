import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminRole, AppRole } from '@/hooks/useAdminRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function AdminGuard({ children, requiredRole }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (requiredRole && role !== requiredRole && role !== 'super_admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="w-16 h-16 text-destructive" />
        <h1 className="text-xl font-bold">Insufficient Permissions</h1>
        <p className="text-muted-foreground">This section requires {requiredRole} access.</p>
      </div>
    );
  }

  return <>{children}</>;
}
