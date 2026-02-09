import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'super_admin' | 'moderator' | 'support';

interface AdminRoleState {
  isAdmin: boolean;
  role: AppRole | null;
  loading: boolean;
}

export function useAdminRole(): AdminRoleState {
  const { user } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ isAdmin: false, role: null, loading: false });
      return;
    }

    const checkRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setState({ isAdmin: false, role: null, loading: false });
      } else {
        setState({ isAdmin: true, role: data.role as AppRole, loading: false });
      }
    };

    checkRole();
  }, [user]);

  return state;
}
