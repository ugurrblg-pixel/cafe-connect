import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Users, MapPin, MessageCircle, Heart, Crown, Flag, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalUsers: number;
  activeUsers24h: number;
  activeCheckIns: number;
  activeConversations: number;
  matchesToday: number;
  premiumUsers: number;
  pendingReports: number;
}

function StatCard({ label, value, icon: Icon, loading }: { label: string; value: number; icon: any; loading: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-bold text-foreground">{value}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
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
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of app activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} loading={loading} />
        <StatCard label="Active Users (24h)" value={stats?.activeUsers24h || 0} icon={Activity} loading={loading} />
        <StatCard label="Active Check-ins" value={stats?.activeCheckIns || 0} icon={MapPin} loading={loading} />
        <StatCard label="Active Conversations" value={stats?.activeConversations || 0} icon={MessageCircle} loading={loading} />
        <StatCard label="Matches Today" value={stats?.matchesToday || 0} icon={Heart} loading={loading} />
        <StatCard label="Premium Users" value={stats?.premiumUsers || 0} icon={Crown} loading={loading} />
        <StatCard label="Pending Reports" value={stats?.pendingReports || 0} icon={Flag} loading={loading} />
      </div>
    </AdminLayout>
  );
}
