import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  display_name: string;
  bio: string;
  photo_url: string;
  purpose: string;
  is_visible: boolean;
  allow_dms: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeUserId = useRef<string | null>(null);
  const profileReadyUserId = useRef<string | null>(null);
  const profileRequest = useRef(0);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, bio, photo_url, purpose, is_visible, allow_dms')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const request = ++profileRequest.current;
      const profileData = await fetchProfile(user.id);
      if (activeUserId.current === user.id && request === profileRequest.current) {
        setProfile(profileData);
        profileReadyUserId.current = user.id;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let disposed = false;
    let authEventReceived = false;
    const applySession = (nextSession: Session | null, event?: string) => {
      if (disposed) return;
      const userId = nextSession?.user.id ?? null;
      const identityChanged = activeUserId.current !== userId;
      if (identityChanged) {
        setProfile(null);
        profileReadyUserId.current = null;
      }
      activeUserId.current = userId;
      setSession(nextSession);
      // A renewed token still belongs to the same user. Preserve the user
      // reference so page-owned effects do not restart on tab focus.
      setUser(previous => !identityChanged && event !== 'USER_UPDATED' ? previous : nextSession?.user ?? null);
      const ready = !!userId && profileReadyUserId.current === userId;
      setLoading(!!userId && !ready);
      if (ready && event !== 'USER_UPDATED') return;
      const request = ++profileRequest.current;
      if (!userId) {
        profileReadyUserId.current = null;
        setProfile(null);
        return;
      }
      // Keep Supabase requests outside its synchronous auth callback.
      setTimeout(async () => {
        if (disposed || request !== profileRequest.current) return;
        const profileData = await fetchProfile(userId);
        if (disposed || request !== profileRequest.current || activeUserId.current !== userId) return;
        setProfile(profileData);
        profileReadyUserId.current = userId;
        setLoading(false);
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        authEventReceived = true;
        applySession(nextSession, event);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!authEventReceived) applySession(initialSession);
    }).catch(() => {
      if (!authEventReceived) applySession(null);
    });

    return () => {
      disposed = true;
      ++profileRequest.current;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Profile is complete if display_name is not empty
  const profileComplete = !!(profile?.display_name && profile.display_name.trim());

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileComplete, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
