import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** Poll only caller-scoped RPCs; discard responses from previous sessions. */
export function useOwnedInteractionList<T>(load: () => Promise<T[]>, enabled: boolean, scopeKey = '', pollMs = 15000) {
  const { user } = useAuth();
  const [data, setData] = useState<{ owner?: string; rows: T[] }>({ rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const owner = user ? `${user.id}|${scopeKey}` : undefined;
  const currentUser = useRef(owner);
  currentUser.current = owner;
  const request = useRef(0);
  const refetch = useCallback(async () => {
    const id = owner;
    const sequence = ++request.current;
    if (!id || !enabled) { setData({ owner: id, rows: [] }); setLoading(false); return; }
    try {
      const next = await load();
      if (id === currentUser.current && sequence === request.current) { setData({ owner: id, rows: next }); setError(false); }
    } catch {
      if (id === currentUser.current && sequence === request.current) { setData({ owner: id, rows: [] }); setError(true); }
    } finally {
      if (id === currentUser.current && sequence === request.current) setLoading(false);
    }
  }, [owner, load, enabled]);
  useEffect(() => {
    setData({ owner, rows: [] }); setError(false); setLoading(!!user && enabled); void refetch();
    if (!user || !enabled) return;
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refetch(); }, pollMs);
    const visible = () => { if (document.visibilityState === 'visible') void refetch(); };
    document.addEventListener('visibilitychange', visible);
    return () => { ++request.current; clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [refetch, pollMs]);
  return { rows: data.owner === owner && enabled ? data.rows : [], loading, error, refetch };
}
