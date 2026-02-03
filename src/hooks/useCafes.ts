import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Cafe {
  id: string;
  name: string;
  address: string;
  distance: string;
  imageUrl: string;
  activeUsers: number;
  rating: number;
  isOpen: boolean;
}

export function useCafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCafes = async () => {
    // First get all cafes
    const { data: cafesData, error: cafesError } = await supabase
      .from('cafes')
      .select('*')
      .order('name');

    if (cafesError) {
      console.error('Error fetching cafes:', cafesError);
      setLoading(false);
      return;
    }

    // Then get active check-in counts for each cafe
    const { data: checkInsData, error: checkInsError } = await supabase
      .from('check_ins')
      .select('cafe_id')
      .gt('expiry_time', new Date().toISOString());

    if (checkInsError) {
      console.error('Error fetching check-ins:', checkInsError);
    }

    // Count active users per cafe
    const activeUserCounts: Record<string, number> = {};
    (checkInsData || []).forEach((checkIn) => {
      activeUserCounts[checkIn.cafe_id] = (activeUserCounts[checkIn.cafe_id] || 0) + 1;
    });

    const formattedCafes: Cafe[] = (cafesData || []).map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      address: cafe.address || '',
      distance: cafe.distance || '',
      imageUrl: cafe.image_url || '',
      activeUsers: activeUserCounts[cafe.id] || 0,
      rating: Number(cafe.rating) || 4.5,
      isOpen: cafe.is_open,
    }));

    setCafes(formattedCafes);
    setLoading(false);
  };

  useEffect(() => {
    fetchCafes();

    // Subscribe to realtime changes on check_ins
    const channel = supabase
      .channel('cafes-check-ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
        },
        () => {
          fetchCafes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { cafes, loading, refetch: fetchCafes };
}
