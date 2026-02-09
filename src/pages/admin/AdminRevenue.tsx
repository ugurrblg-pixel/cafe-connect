import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, TrendingUp, RotateCcw, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RevenueStats {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  daily_count: number;
  weekly_count: number;
  monthly_count: number;
  refund_count: number;
  refund_amount: number;
}

function RevenueCard({ label, amount, count, icon: Icon, loading, variant }: {
  label: string;
  amount: number;
  count: number;
  icon: any;
  loading: boolean;
  variant?: 'default' | 'destructive';
}) {
  const formatUSD = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className={cn(
      "bg-card border rounded-xl p-5",
      variant === 'destructive' ? "border-destructive/30" : "border-border"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={cn("w-5 h-5", variant === 'destructive' ? 'text-destructive/50' : 'text-muted-foreground/50')} />
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ) : (
        <>
          <p className={cn("text-3xl font-bold", variant === 'destructive' ? 'text-destructive' : 'text-foreground')}>
            {formatUSD(amount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{count} transaction{count !== 1 ? 's' : ''}</p>
        </>
      )}
    </div>
  );
}

export default function AdminRevenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await supabase.functions.invoke('admin-payments?action=revenue-stats');

    if (res.error) {
      console.error('Error fetching revenue stats:', res.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setStats(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revenue Dashboard</h1>
          <p className="text-muted-foreground text-sm">Financial overview from Stripe</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchStats(); }} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RevenueCard
          label="Daily Revenue"
          amount={stats?.daily_revenue || 0}
          count={stats?.daily_count || 0}
          icon={DollarSign}
          loading={loading}
        />
        <RevenueCard
          label="Weekly Revenue"
          amount={stats?.weekly_revenue || 0}
          count={stats?.weekly_count || 0}
          icon={TrendingUp}
          loading={loading}
        />
        <RevenueCard
          label="Monthly Revenue"
          amount={stats?.monthly_revenue || 0}
          count={stats?.monthly_count || 0}
          icon={CreditCard}
          loading={loading}
        />
        <RevenueCard
          label="Refunds (30d)"
          amount={stats?.refund_amount || 0}
          count={stats?.refund_count || 0}
          icon={RotateCcw}
          loading={loading}
          variant="destructive"
        />
      </div>
    </AdminLayout>
  );
}