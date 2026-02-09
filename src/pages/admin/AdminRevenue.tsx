import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Crown, TrendingUp, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  monthlyPlans: number;
  yearlyPlans: number;
}

function StatCard({ label, value, icon: Icon, loading, variant }: {
  label: string;
  value: string | number;
  icon: any;
  loading: boolean;
  variant?: 'default' | 'accent' | 'destructive' | 'muted';
}) {
  const colorMap = {
    default: 'border-border',
    accent: 'border-accent/30',
    destructive: 'border-destructive/30',
    muted: 'border-border',
  };
  const textMap = {
    default: 'text-foreground',
    accent: 'text-accent',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  };

  return (
    <div className={cn("bg-card border rounded-xl p-5", colorMap[variant || 'default'])}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className={cn("text-3xl font-bold", textMap[variant || 'default'])}>{value}</p>
      )}
    </div>
  );
}

export default function AdminRevenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, plan_type');

    if (error) {
      console.error('Error fetching subscription stats:', error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const all = data || [];
    setStats({
      totalSubscriptions: all.length,
      activeSubscriptions: all.filter(s => s.status === 'active').length,
      cancelledSubscriptions: all.filter(s => s.status === 'cancelled').length,
      expiredSubscriptions: all.filter(s => s.status === 'expired' || s.status === 'inactive').length,
      monthlyPlans: all.filter(s => s.plan_type === 'monthly').length,
      yearlyPlans: all.filter(s => s.plan_type === 'yearly').length,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Overview</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Google Play subscription analytics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchStats(); }} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Subscriptions" value={stats?.totalSubscriptions || 0} icon={Users} loading={loading} />
        <StatCard label="Active" value={stats?.activeSubscriptions || 0} icon={Crown} loading={loading} variant="accent" />
        <StatCard label="Cancelled" value={stats?.cancelledSubscriptions || 0} icon={TrendingUp} loading={loading} variant="destructive" />
        <StatCard label="Expired / Inactive" value={stats?.expiredSubscriptions || 0} icon={Users} loading={loading} variant="muted" />
        <StatCard label="Monthly Plans" value={stats?.monthlyPlans || 0} icon={Crown} loading={loading} />
        <StatCard label="Yearly Plans" value={stats?.yearlyPlans || 0} icon={Crown} loading={loading} />
      </div>
    </AdminLayout>
  );
}
