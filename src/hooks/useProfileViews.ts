import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_at: string;
  viewer_profile?: {
    display_name: string | null;
    photo_url: string | null;
    purpose: string;
  };
}

export function useProfileViews() {
  const { user } = useAuth();
  const [views, setViews] = useState<ProfileView[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchViews = useCallback(async () => {
    if (!user) {
      setViews([]);
      setViewCount(0);
      setLoading(false);
      return;
    }

    try {
      // Get profile ID first
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Fetch profile views with viewer info
      const { data, error } = await supabase
        .from('profile_views')
        .select(`
          id,
          viewer_id,
          viewed_at
        `)
        .eq('viewed_profile_id', profile.id)
        .order('viewed_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch viewer profiles separately
      if (data && data.length > 0) {
        const viewerIds = data.map(v => v.viewer_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, photo_url, purpose')
          .in('user_id', viewerIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const viewsWithProfiles = data.map(view => ({
          ...view,
          viewer_profile: profileMap.get(view.viewer_id) || undefined,
        }));

        setViews(viewsWithProfiles);
        setViewCount(viewsWithProfiles.length);
      } else {
        setViews([]);
        setViewCount(0);
      }
    } catch (error) {
      console.error('Error fetching profile views:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logProfileView = useCallback(async (viewedProfileId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('profile_views')
        .upsert(
          {
            viewed_profile_id: viewedProfileId,
            viewer_id: user.id,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: 'viewed_profile_id,viewer_id' }
        );
    } catch (error) {
      console.error('Error logging profile view:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  return {
    views,
    viewCount,
    loading,
    logProfileView,
    refreshViews: fetchViews,
  };
}
