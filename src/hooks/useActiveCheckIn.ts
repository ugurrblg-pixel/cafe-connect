import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveCheckIn {
  id: string;
  cafeId: string;
  cafeName: string;
  checkInTime: Date;
  expiryTime: Date;
}

export function useActiveCheckIn() {
  const { user } = useAuth();
  const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActiveCheckIn(null);
      setLoading(false);
      return;
    }

    const fetchActiveCheckIn = async () => {
      // Get user's active check-in (RLS filters for expiry_time > now())
      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .select(`
          id,
          cafe_id,
          check_in_time,
          expiry_time,
          cafes (name)
        `)
        .eq('user_id', user.id)
        .gt('expiry_time', new Date().toISOString())
        .maybeSingle();

      if (error || !checkIn) {
        setActiveCheckIn(null);
        setLoading(false);
        return;
      }

      setActiveCheckIn({
        id: checkIn.id,
        cafeId: checkIn.cafe_id,
        cafeName: (checkIn.cafes as any)?.name || 'Unknown Cafe',
        checkInTime: new Date(checkIn.check_in_time),
        expiryTime: new Date(checkIn.expiry_time),
      });
      setLoading(false);
    };

    fetchActiveCheckIn();

    // Subscribe to changes
    const channel = supabase
      .channel('active-checkin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchActiveCheckIn();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkOut = async () => {
    if (!activeCheckIn) return false;

    const { error } = await supabase
      .from('check_ins')
      .delete()
      .eq('id', activeCheckIn.id);

    if (error) return false;
    
    setActiveCheckIn(null);
    return true;
  };

  return { activeCheckIn, loading, checkOut };
}
