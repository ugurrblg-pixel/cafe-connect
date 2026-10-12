import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CafeUser {
  id: string; userId: string; name: string; displayName: string;
  age: number | null; bio: string; photoUrl: string; photoUrls: string[];
  purpose: 'chat' | 'friendship' | 'dating'; allowDMs: boolean;
  isVisible: boolean; isVerified: boolean; checkedInAt: Date; lastActiveAt: Date; hobbies: string[];
}

export function useCafeUsers(cafeId: string, options: { isCheckedIn?: boolean } = {}) {
  const { user } = useAuth();
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const generation = useRef(0);
  const request = useRef(0);
  const fetchActiveUsers = useCallback(async () => {
    const scope = generation.current;
    const sequence = ++request.current;
    const current = () => generation.current === scope && request.current === sequence;
    if (!user || !cafeId || !options.isCheckedIn) {
      setUsers([]); setLoading(false); setConnectionStatus('disconnected'); return;
    }
    try {
      if (import.meta.env.VITE_CAFE_MEMBER_LIST_ENABLED === 'true') {
        const { data, error } = await supabase.rpc('list_current_cafe_members', { target_cafe_id: cafeId });
        if (error) throw error;
        if (!current()) return;
        setUsers((data || []).map(row => ({
          id: row.id, userId: row.user_id, name: row.display_name || 'Anonymous',
          displayName: row.display_name || 'Anonymous', age: row.age, bio: row.bio || '',
          photoUrl: '', photoUrls: [], purpose: row.purpose as CafeUser['purpose'],
          allowDMs: row.allow_dms, isVisible: true, isVerified: row.is_verified,
          hobbies: row.hobbies || [], checkedInAt: new Date(row.check_in_time),
          lastActiveAt: new Date(row.last_active_at || row.check_in_time),
        })));
        setConnectionStatus('connected');
        return;
      }
      // RLS is the authority. Do not broadcast profile data over public presence.
      const { data: checkIns, error: checkInError } = await supabase.from('check_ins')
        .select('user_id, check_in_time, last_active_at').eq('cafe_id', cafeId)
        .gt('expiry_time', new Date().toISOString());
      if (checkInError) throw checkInError;
      if (!current()) return;
      if (!checkIns?.length) { setUsers([]); setConnectionStatus('connected'); return; }
      const { data: profiles, error: profileError } = await supabase.from('profiles')
        .select('id, user_id, display_name, age, bio, photo_url, photo_urls, purpose, allow_dms, is_visible, hobbies, is_verified')
        .in('user_id', checkIns.map(row => row.user_id));
      if (profileError) throw profileError;
      if (!current()) return;
      const byId = new Map((profiles || []).map(profile => [profile.user_id, profile]));
      const result: CafeUser[] = [];
      for (const checkIn of checkIns) {
        const profile = byId.get(checkIn.user_id);
        if (!profile || !profile.is_visible) continue;
        result.push({
          id: profile.id, userId: profile.user_id,
          name: profile.display_name || 'Anonymous', displayName: profile.display_name || 'Anonymous',
          age: profile.age, bio: profile.bio || '', photoUrl: profile.photo_url || '',
          photoUrls: profile.photo_urls || [], purpose: profile.purpose as CafeUser['purpose'],
          allowDMs: profile.allow_dms, isVisible: true, isVerified: profile.is_verified,
          checkedInAt: new Date(checkIn.check_in_time),
          lastActiveAt: new Date(checkIn.last_active_at || checkIn.check_in_time), hobbies: profile.hobbies || [],
        });
      }
      setUsers(result); setConnectionStatus('connected');
    } catch {
      if (current()) { setUsers([]); setConnectionStatus('disconnected'); }
    } finally { if (current()) setLoading(false); }
  }, [cafeId, user?.id, options.isCheckedIn]);

  useEffect(() => {
    ++generation.current;
    setUsers([]); setLoading(true); setConnectionStatus('connecting');
    void fetchActiveUsers();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void fetchActiveUsers(); }, 30000);
    const visible = () => { if (document.visibilityState === 'visible') void fetchActiveUsers(); };
    document.addEventListener('visibilitychange', visible);
    return () => { ++generation.current; clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [fetchActiveUsers]);
  return { users, loading, connectionStatus, refetch: fetchActiveUsers };
}
