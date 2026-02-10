import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  google_play_product_id: string | null;
  created_at: string;
  profile_name?: string;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Enrich with profile names
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name || p.name])
      );

      const enriched = data.map(s => ({
        ...s,
        profile_name: profileMap.get(s.user_id) || 'Unknown',
      }));

      setSubscriptions(enriched);
    } else {
      setSubscriptions([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => { setLoading(true); fetchSubscriptions(); }, [fetchSubscriptions]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-accent/10 text-accent',
      cancelled: 'bg-destructive/10 text-destructive',
      expired: 'bg-muted text-muted-foreground',
      inactive: 'bg-warning/10 text-warning',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const filtered = subscriptions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.profile_name || '').toLowerCase().includes(q) ||
      s.user_id.toLowerCase().includes(q) ||
      (s.google_play_product_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abonelikler</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Google Play abonelikleri (salt okunur)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchSubscriptions(); }} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} /> Yenile
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="İsim veya kullanıcı ID ile ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'active', 'cancelled', 'expired'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
            )}>{s === 'all' ? 'Tümü' : s}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kullanıcı</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bitiş</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Abonelik bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map(sub => (
                  <tr key={sub.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{sub.profile_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{sub.user_id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-foreground">{sub.plan_type}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{sub.google_play_product_id || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusBadge(sub.status))}>{sub.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
