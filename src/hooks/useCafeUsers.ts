import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { INACTIVITY_TIMEOUT_MS } from '@/lib/geolocation';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface PresenceState {
  user_id: string;
  display_name: string;
  photo_url: string;
  purpose: string;
  online_at: string; // ISO timestamp of last presence heartbeat
}

// Reconnection config
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_JITTER = 0.3;

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
  lastActiveAt: Date; // Derived from presence heartbeat
  userId: string;
}

interface UseCafeUsersOptions {
  /** If true, user joins the presence channel when checked in */
  joinPresence?: boolean;
  /** User's display name for presence */
  displayName?: string;
  /** User's photo URL for presence */
  photoUrl?: string;
  /** User's purpose for presence */
  purpose?: string;
  /** Whether user is checked in at this cafe */
  isCheckedIn?: boolean;
}

export function useCafeUsers(cafeId: string, options: UseCafeUsersOptions = {}) {
  const { user } = useAuth();
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceState>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  
  // Optimistic state: keep previous presence during reconnection
  const lastKnownPresenceRef = useRef<Map<string, PresenceState>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const dbChannelRef = useRef<RealtimeChannel | null>(null);

  // Fetch check-ins from database (source of truth for who is checked in)
  const fetchActiveUsers = useCallback(async () => {
    if (!cafeId) return;

    // Get active check-ins from DB (RLS filters for expiry_time > now())
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

    // Filter out inactive users (no DB activity in last 15 minutes)
    // This is a fallback - presence heartbeat is the primary activity indicator
    const now = Date.now();
    const activeCheckIns = checkInsData.filter((checkIn) => {
      if (!checkIn.last_active_at) return true;
      const lastActive = new Date(checkIn.last_active_at).getTime();
      return now - lastActive < INACTIVITY_TIMEOUT_MS;
    });

    if (activeCheckIns.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const userIds = activeCheckIns.map((c) => c.user_id);

    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, name, display_name, age, bio, photo_url, purpose, allow_dms, is_visible')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    const profileMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

    // Build users list, using presence for activity if available
    const activeUsers: CafeUser[] = activeCheckIns
      .map((checkIn) => {
        const profile = profileMap.get(checkIn.user_id);
        if (!profile) return null;

        // Get activity from presence if available, otherwise fall back to DB
        const presence = presenceMap.get(checkIn.user_id);
        const lastActiveAt = presence?.online_at 
          ? new Date(presence.online_at)
          : new Date(checkIn.last_active_at || checkIn.check_in_time);

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
          lastActiveAt,
        };
      })
      .filter((u): u is CafeUser => u !== null);

    setUsers(activeUsers);
    setLoading(false);
  }, [cafeId, presenceMap]);

  // Calculate reconnect delay with exponential backoff + jitter
  const getReconnectDelay = useCallback(() => {
    const baseDelay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptRef.current),
      RECONNECT_MAX_DELAY
    );
    const jitter = baseDelay * RECONNECT_JITTER * (Math.random() * 2 - 1);
    return baseDelay + jitter;
  }, []);

  // Setup presence channel for real-time activity tracking with graceful reconnection
  useEffect(() => {
    if (!cafeId) return;

    const setupChannel = () => {
      setConnectionStatus('connecting');
      
      const channel = supabase.channel(`cafe-presence-${cafeId}`, {
        config: {
          presence: {
            key: user?.id || 'anonymous',
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceState>();
          const newPresenceMap = new Map<string, PresenceState>();
          
          // Flatten presence state into a map by user_id
          Object.values(state).flat().forEach((presence) => {
            if (presence.user_id) {
              newPresenceMap.set(presence.user_id, presence);
            }
          });
          
          // Update optimistic cache
          lastKnownPresenceRef.current = newPresenceMap;
          setPresenceMap(newPresenceMap);
          
          // Reset reconnect counter on successful sync
          reconnectAttemptRef.current = 0;
          setConnectionStatus('connected');
        })
        .subscribe(async (status, err) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttemptRef.current = 0;
            
            if (options.joinPresence && options.isCheckedIn && user) {
              // Track this user's presence with heartbeat
              await channel.track({
                user_id: user.id,
                display_name: options.displayName || '',
                photo_url: options.photoUrl || '',
                purpose: options.purpose || 'chat',
                online_at: new Date().toISOString(),
              });
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Presence channel error, scheduling reconnect:', err);
            setConnectionStatus('reconnecting');
            
            // Use optimistic state during reconnection (no flicker)
            if (lastKnownPresenceRef.current.size > 0) {
              setPresenceMap(lastKnownPresenceRef.current);
            }
            
            // Schedule debounced reconnect
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            const delay = getReconnectDelay();
            reconnectAttemptRef.current++;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              supabase.removeChannel(channel);
              setupChannel();
            }, delay);
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });

      presenceChannelRef.current = channel;
      
      return channel;
    };

    const channel = setupChannel();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [cafeId, user, options.joinPresence, options.isCheckedIn, options.displayName, options.photoUrl, options.purpose, getReconnectDelay]);

  // Heartbeat: update presence every 30 seconds while checked in
  useEffect(() => {
    if (!options.joinPresence || !options.isCheckedIn || !user || !presenceChannelRef.current) {
      return;
    }

    const sendHeartbeat = async () => {
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.track({
          user_id: user.id,
          display_name: options.displayName || '',
          photo_url: options.photoUrl || '',
          purpose: options.purpose || 'chat',
          online_at: new Date().toISOString(),
        });
      }
    };

    // Send heartbeat every 30 seconds
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [user, options.joinPresence, options.isCheckedIn, options.displayName, options.photoUrl, options.purpose]);

  // Disconnect presence on checkout
  useEffect(() => {
    if (!options.isCheckedIn && presenceChannelRef.current) {
      // Untrack presence when checked out
      presenceChannelRef.current.untrack();
    }
  }, [options.isCheckedIn]);

  // Subscribe to DB changes for check-in/check-out events
  useEffect(() => {
    if (!cafeId) return;

    fetchActiveUsers();

    const channel = supabase
      .channel(`cafe-db-${cafeId}`)
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

    dbChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      dbChannelRef.current = null;
    };
  }, [cafeId, fetchActiveUsers]);

  // Re-fetch when presence map changes (to update lastActiveAt)
  useEffect(() => {
    if (presenceMap.size > 0) {
      fetchActiveUsers();
    }
  }, [presenceMap, fetchActiveUsers]);

  return { users, loading, connectionStatus, refetch: fetchActiveUsers };
}
