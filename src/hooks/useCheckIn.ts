import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CheckIn {
  id: string;
  user_id: string;
  cafe_id: string;
  check_in_time: string;
  expiry_time: string;
}

export function useCheckIn(cafeId: string) {
  const { user } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already checked in at this cafe
  useEffect(() => {
    if (!user || !cafeId) {
      setLoading(false);
      return;
    }

    const checkExistingCheckIn = async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('cafe_id', cafeId)
        // Rely on database-side filtering (RLS policy expiry_time > now())
        .maybeSingle();

      if (!error && data) {
        setCurrentCheckIn(data);
        setIsCheckedIn(true);
      } else {
        setCurrentCheckIn(null);
        setIsCheckedIn(false);
      }
      setLoading(false);
    };

    checkExistingCheckIn();
  }, [user, cafeId]);

  const checkIn = async () => {
    if (!user) {
      toast.error('Please log in to check in');
      return false;
    }

    try {
      // First, delete any existing check-ins for this user at any cafe
      await supabase
        .from('check_ins')
        .delete()
        .eq('user_id', user.id);

      // Create new check-in with explicit expiry (60 minutes from now)
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          cafe_id: cafeId,
          expiry_time: expiryTime,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCheckIn(data);
      setIsCheckedIn(true);
      return true;
    } catch (error: any) {
      toast.error('Failed to check in: ' + error.message);
      return false;
    }
  };

  const checkOut = async () => {
    if (!user || !currentCheckIn) return false;

    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', currentCheckIn.id);

      if (error) throw error;

      setCurrentCheckIn(null);
      setIsCheckedIn(false);
      return true;
    } catch (error: any) {
      toast.error('Failed to check out: ' + error.message);
      return false;
    }
  };

  return {
    isCheckedIn,
    currentCheckIn,
    loading,
    checkIn,
    checkOut,
  };
}
