import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_at: string;
  cafe_id: string | null;
  viewer_profile?: {
    display_name: string | null;
    photo_url: string | null;
    purpose: string;
    user_id: string;
  };
  same_cafe?: boolean;
}

const PAGE_SIZE = 20;

export function useProfileViews() {
  const { user } = useAuth();
  const [views, setViews] = useState<ProfileView[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchViews = useCallback(async (pageNum = 0, append = false) => {
    if (!user) {
      setViews([]);
      setTodayCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch views with pagination (last 7 days)
      // viewed_profile_id stores auth user_id (not profile table id)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('profile_views')
        .select('id, viewer_id, viewed_at, cafe_id')
        .eq('viewed_profile_id', user.id)
        .gte('viewed_at', sevenDaysAgo.toISOString())
        .order('viewed_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      setHasMore((data?.length || 0) === PAGE_SIZE);

      if (data && data.length > 0) {
        // Fetch viewer profiles
        const viewerIds = [...new Set(data.map(v => v.viewer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, photo_url, purpose')
          .in('user_id', viewerIds);

        // Check same-cafe for active check-ins
        const { data: myCheckIn } = await supabase
          .from('check_ins')
          .select('cafe_id')
          .eq('user_id', user.id)
          .maybeSingle();

        let sameCafeUserIds = new Set<string>();
        if (myCheckIn?.cafe_id) {
          const { data: cafeCheckIns } = await supabase
            .from('check_ins')
            .select('user_id')
            .eq('cafe_id', myCheckIn.cafe_id)
            .in('user_id', viewerIds);
          sameCafeUserIds = new Set(cafeCheckIns?.map(c => c.user_id) || []);
        }

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const viewsWithProfiles: ProfileView[] = data.map(view => ({
          ...view,
          viewer_profile: profileMap.get(view.viewer_id) ? {
            ...profileMap.get(view.viewer_id)!,
            user_id: view.viewer_id,
          } : undefined,
          same_cafe: sameCafeUserIds.has(view.viewer_id),
        }));

        if (append) {
          setViews(prev => [...prev, ...viewsWithProfiles]);
        } else {
          setViews(viewsWithProfiles);
        }
      } else if (!append) {
        setViews([]);
      }

      // Count today's views
      if (pageNum === 0) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count } = await supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('viewed_profile_id', user.id)
          .gte('viewed_at', todayStart.toISOString());

        setTodayCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching profile views:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchViews(nextPage, true);
  }, [page, fetchViews]);

  const logProfileView = useCallback(async (viewedProfileId: string, cafeId?: string | null) => {
    if (!user) return;

    try {
      await supabase
        .from('profile_views')
        .insert({
          viewed_profile_id: viewedProfileId,
          viewer_id: user.id,
          cafe_id: cafeId || null,
        });
    } catch (error) {
      console.error('Error logging profile view:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-views-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views',
        },
        () => {
          // Refresh on new view
          fetchViews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchViews]);

  return {
    views,
    todayCount,
    loading,
    hasMore,
    logProfileView,
    loadMore,
    refreshViews: fetchViews,
  };
}
