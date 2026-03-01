import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RandomMatchUser {
  id: string;
  user_id: string;
  display_name: string;
  photo_url: string;
  bio: string;
  age: number | null;
  purpose: string;
  gender: string | null;
}

interface UseRandomMatchResult {
  matchedUser: RandomMatchUser | null;
  loading: boolean;
  error: string | null;
  alreadyUsedToday: boolean;
  conversationId: string | null;
  findRandomMatch: () => Promise<void>;
  startConversation: () => Promise<void>;
  reset: () => void;
}

export function useRandomMatch(): UseRandomMatchResult {
  const { user } = useAuth();
  const [matchedUser, setMatchedUser] = useState<RandomMatchUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyUsedToday, setAlreadyUsedToday] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const findRandomMatch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setMatchedUser(null);

    try {
      // Check if already used today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('daily_random_matches' as any)
        .select('id, matched_user_id, conversation_id')
        .eq('user_id', user.id)
        .eq('match_date', today)
        .maybeSingle();

      if (existing) {
        setAlreadyUsedToday(true);
        // Load the previously matched user
        const { data: prevUser } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, photo_url, bio, age, purpose, gender')
          .eq('user_id', (existing as any).matched_user_id)
          .maybeSingle();
        if (prevUser) {
          setMatchedUser(prevUser as any);
          setConversationId((existing as any).conversation_id || null);
        }
        setLoading(false);
        return;
      }

      // Get current user's gender
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('user_id', user.id)
        .maybeSingle();

      const myGender = (myProfile as any)?.gender;
      if (!myGender) {
        setError('Cinsiyet bilgini profilinden ayarlamalısın');
        setLoading(false);
        return;
      }

      // Determine opposite gender
      const oppositeGender = myGender === 'male' ? 'female' : myGender === 'female' ? 'male' : null;

      // Find active users (checked in recently) with opposite gender
      const { data: activeCheckIns } = await supabase
        .from('check_ins')
        .select('user_id')
        .gt('expiry_time', new Date().toISOString())
        .neq('user_id', user.id);

      const activeUserIds = (activeCheckIns || []).map((c: any) => c.user_id);

      if (activeUserIds.length === 0) {
        setError('Şu an aktif kullanıcı bulunamadı');
        setLoading(false);
        return;
      }

      // Build query for profiles
      // Build query for profiles - cast to any to avoid deep type instantiation
      const profileQuery = supabase
        .from('profiles')
        .select('id, user_id, display_name, photo_url, bio, age, purpose, gender')
        .in('user_id', activeUserIds)
        .not('display_name', 'eq', '')
        .not('photo_url', 'eq', '') as any;

      const { data: candidates, error: queryError } = oppositeGender
        ? await profileQuery.eq('gender', oppositeGender)
        : await profileQuery;

      if (queryError) throw queryError;

      if (!candidates || candidates.length === 0) {
        setError('Uygun kullanıcı bulunamadı');
        setLoading(false);
        return;
      }

      // Pick random
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const chosen = candidates[randomIndex] as any;

      // Record the daily match
      await supabase
        .from('daily_random_matches' as any)
        .insert({
          user_id: user.id,
          matched_user_id: chosen.user_id,
          match_date: today,
        });

      setMatchedUser(chosen);
    } catch (err: any) {
      console.error('Random match error:', err);
      setError('Bir hata oluştu, tekrar dene');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const startConversation = useCallback(async () => {
    if (!user || !matchedUser) return;
    setLoading(true);

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${matchedUser.user_id}),and(user1_id.eq.${matchedUser.user_id},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConv) {
        setConversationId(existingConv.id);
        setLoading(false);
        return;
      }

      // First create a match (required by RLS for conversations)
      // Find a cafe where either user is checked in
      const { data: checkIn } = await supabase
        .from('check_ins')
        .select('cafe_id')
        .eq('user_id', matchedUser.user_id)
        .gt('expiry_time', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      const cafeId = checkIn?.cafe_id;
      if (!cafeId) {
        setError('Kullanıcı artık aktif değil');
        setLoading(false);
        return;
      }

      // Create match
      const { error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: user.id,
          user2_id: matchedUser.user_id,
          cafe_id: cafeId,
        });

      if (matchError) throw matchError;

      // Create conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user1_id: user.id,
          user2_id: matchedUser.user_id,
          cafe_id: cafeId,
        })
        .select('id')
        .single();

      if (convError) throw convError;

      setConversationId(newConv.id);

      // Update the daily match record with conversation_id
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_random_matches' as any)
        .update({ conversation_id: newConv.id } as any)
        .eq('user_id', user.id)
        .eq('match_date', today);

    } catch (err: any) {
      console.error('Start conversation error:', err);
      setError('Sohbet başlatılamadı');
    } finally {
      setLoading(false);
    }
  }, [user, matchedUser]);

  const reset = useCallback(() => {
    setMatchedUser(null);
    setError(null);
    setConversationId(null);
  }, []);

  return {
    matchedUser,
    loading,
    error,
    alreadyUsedToday,
    conversationId,
    findRandomMatch,
    startConversation,
    reset,
  };
}
