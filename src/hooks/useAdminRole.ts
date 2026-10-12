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
    let active = true;
    if (!user) {
      setState({ isAdmin: false, role: null, loading: false });
      return;
    }

    const checkRole = async () => {
      const { data, error } = await supabase.rpc('get_own_admin_role');
      if (!active) return;

      if (error || !data || !['super_admin','moderator','support'].includes(data)) {
        setState({ isAdmin: false, role: null, loading: false });
      } else {
        setState({ isAdmin: true, role: data as AppRole, loading: false });
      }
    };

    setState({isAdmin:false,role:null,loading:true});
    void checkRole().catch(()=>{if(active)setState({isAdmin:false,role:null,loading:false});});
    return ()=>{active=false;};
  }, [user?.id]);

  return state;
}
