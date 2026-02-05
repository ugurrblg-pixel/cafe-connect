import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CafeUser {
  id: string;
  name: string;
  displayName: string;
  age: number | null;
  bio: string;
  photoUrl: string;
  purpose: 'chat' | 'friendship' | 'dating';
  allowDMs: boolean;
  isVisible: boolean;
  checkedInAt: Date;
  userId: string;
}

export function useCafeUsers(cafeId: string) {
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveUsers = async () => {
    // First get active check-ins
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('id, check_in_time, user_id')
      .eq('cafe_id', cafeId)
      .gt('expiry_time', new Date().toISOString());

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
      setLoading(false);
      return;
    }

    if (!checkInsData || checkInsData.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Get the user_ids from check-ins
    const userIds = checkInsData.map((c) => c.user_id);

    // Fetch profiles for those users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, name, display_name, age, bio, photo_url, purpose, allow_dms, is_visible')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Map profiles by user_id for quick lookup
    const profileMap = new Map(
      (profilesData || []).map((p) => [p.user_id, p])
    );

    // Build the active users list - ALL checked-in users are visible regardless of is_visible setting
    const activeUsers: CafeUser[] = checkInsData
      .map((checkIn) => {
        const profile = profileMap.get(checkIn.user_id);
        if (!profile) return null;

        return {
          id: profile.id,
          userId: profile.user_id,
          name: profile.name || 'Anonymous',
          displayName: profile.display_name || profile.name || 'Anonymous',
          age: profile.age,
          bio: profile.bio || '',
          photoUrl: profile.photo_url || '',
          purpose: profile.purpose as 'chat' | 'friendship' | 'dating',
          allowDMs: profile.allow_dms,
          isVisible: profile.is_visible ?? true,
          checkedInAt: new Date(checkIn.check_in_time),
        };
      })
      .filter((u): u is CafeUser => u !== null);

    setUsers(activeUsers);
    setLoading(false);
  };

  useEffect(() => {
    if (!cafeId) return;

    fetchActiveUsers();

    // Subscribe to realtime changes
    const channel: RealtimeChannel = supabase
      .channel(`cafe-${cafeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `cafe_id=eq.${cafeId}`,
        },
        () => {
          fetchActiveUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeId]);

  return { users, loading, refetch: fetchActiveUsers };
}
