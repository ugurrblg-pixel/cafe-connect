import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { INACTIVITY_TIMEOUT_MS } from '@/lib/geolocation';

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
  lastActiveAt: Date;
  userId: string;
}

export function useCafeUsers(cafeId: string) {
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveUsers = async () => {
    // First get active check-ins.
    // IMPORTANT: Do not use client-side timestamps (device clock/timezone can be wrong).
    // We rely on the database RLS policy (expiry_time > now()) to return only active rows.
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('id, check_in_time, user_id, last_active_at')
      .eq('cafe_id', cafeId);

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

    // Filter out inactive users (no activity in last 15 minutes)
    const now = Date.now();
    const activeCheckIns = checkInsData.filter((checkIn) => {
      if (!checkIn.last_active_at) return true; // Legacy check-ins without last_active_at
      const lastActive = new Date(checkIn.last_active_at).getTime();
      return now - lastActive < INACTIVITY_TIMEOUT_MS;
    });

    if (activeCheckIns.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Get the user_ids from active check-ins
    const userIds = activeCheckIns.map((c) => c.user_id);

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

    // Map check-ins by user_id for quick lookup
    const checkInMap = new Map(
      activeCheckIns.map((c) => [c.user_id, c])
    );

    // Build the active users list - ALL checked-in users are visible regardless of is_visible setting
    const activeUsers: CafeUser[] = activeCheckIns
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
          lastActiveAt: new Date(checkIn.last_active_at || checkIn.check_in_time),
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

    // Refresh every minute to filter out inactive users
    const refreshInterval = setInterval(fetchActiveUsers, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [cafeId]);

  return { users, loading, refetch: fetchActiveUsers };
}
