import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Users, MapPin, MessageCircle, Heart, Crown, Flag, Activity, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  activeCheckIns: number;
  activeConversations: number;
  matchesToday: number;
  premiumUsers: number;
  pendingReports: number;
}

function StatCard({ label, value, icon: Icon, loading, highlight }: { label: string; value: number; icon: any; loading: boolean; highlight?: boolean }) {
  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 transition-colors",
      highlight && value > 0 ? "border-destructive/30 bg-destructive/5" : "border-border"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      usersRes,
      activeUsersRes,
      checkInsRes,
      convsRes,
      matchesRes,
      premiumRes,
      reportsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('check_ins').select('user_id', { count: 'exact', head: true }).gt('expiry_time', last24h),
      supabase.from('check_ins').select('id', { count: 'exact', head: true }).gt('expiry_time', now.toISOString()),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('matches').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      activeUsers24h: activeUsersRes.count || 0,
      activeCheckIns: checkInsRes.count || 0,
      activeConversations: convsRes.count || 0,
      matchesToday: matchesRes.count || 0,
      premiumUsers: premiumRes.count || 0,
      pendingReports: reportsRes.count || 0,
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of app activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} loading={loading} />
        <StatCard label="Active Users (24h)" value={stats?.activeUsers24h || 0} icon={Activity} loading={loading} />
        <StatCard label="Active Check-ins" value={stats?.activeCheckIns || 0} icon={MapPin} loading={loading} />
        <StatCard label="Active Conversations" value={stats?.activeConversations || 0} icon={MessageCircle} loading={loading} />
        <StatCard label="Matches Today" value={stats?.matchesToday || 0} icon={Heart} loading={loading} />
        <StatCard label="Premium Users" value={stats?.premiumUsers || 0} icon={Crown} loading={loading} />
        <StatCard label="Pending Reports" value={stats?.pendingReports || 0} icon={Flag} loading={loading} highlight />
      </div>
    </AdminLayout>
  );
}