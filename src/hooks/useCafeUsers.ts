import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CafeUser {
  id: string;
  name: string;
  age: number | null;
  bio: string;
  photoUrl: string;
  purpose: 'chat' | 'friendship' | 'dating';
  allowDMs: boolean;
  checkedInAt: Date;
  userId: string;
}

export function useCafeUsers(cafeId: string) {
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveUsers = async () => {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        id,
        check_in_time,
        user_id,
        profiles!check_ins_user_id_fkey (
          id,
          user_id,
          name,
          age,
          bio,
          photo_url,
          purpose,
          allow_dms
        )
      `)
      .eq('cafe_id', cafeId)
      .gt('expiry_time', new Date().toISOString());

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    const activeUsers: CafeUser[] = (data || [])
      .filter((checkIn: any) => checkIn.profiles)
      .map((checkIn: any) => ({
        id: checkIn.profiles.id,
        userId: checkIn.profiles.user_id,
        name: checkIn.profiles.name || 'Anonymous',
        age: checkIn.profiles.age,
        bio: checkIn.profiles.bio || '',
        photoUrl: checkIn.profiles.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
        purpose: checkIn.profiles.purpose as 'chat' | 'friendship' | 'dating',
        allowDMs: checkIn.profiles.allow_dms,
        checkedInAt: new Date(checkIn.check_in_time),
      }));

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
