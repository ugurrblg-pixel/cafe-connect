import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Ban, AlertTriangle, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
  adminName?: string;
}

const actionIcons: Record<string, typeof Shield> = {
  ban_user: Ban,
  unban_user: Shield,
  warn_user: AlertTriangle,
  dismiss_report: Eye,
  ban_from_report: Ban,
  delete_message: Trash2,
  delete_conversation: Trash2,
  delete_match: Trash2,
};

const actionColors: Record<string, string> = {
  ban_user: 'bg-destructive/10 text-destructive',
  unban_user: 'bg-accent/10 text-accent',
  warn_user: 'bg-warning/10 text-warning',
  dismiss_report: 'bg-muted text-muted-foreground',
  ban_from_report: 'bg-destructive/10 text-destructive',
  delete_message: 'bg-destructive/10 text-destructive',
  delete_conversation: 'bg-destructive/10 text-destructive',
  delete_match: 'bg-destructive/10 text-destructive',
};

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch admin names
    const adminIds = [...new Set(data.map(e => e.admin_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, name')
      .in('user_id', adminIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.name || 'Unknown']) || []);

    setEntries(data.map(e => ({
      ...e,
      adminName: profileMap.get(e.admin_id) || 'Unknown',
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return e.action.toLowerCase().includes(q)
      || e.target_id.toLowerCase().includes(q)
      || (e.adminName || '').toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm">All admin actions are recorded here</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by action, target, or admin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No audit entries found
          </div>
        ) : (
          filtered.map(entry => {
            const Icon = actionIcons[entry.action] || Shield;
            const colorClass = actionColors[entry.action] || 'bg-muted text-muted-foreground';
            return (
              <div
                key={entry.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-muted-foreground">{entry.adminName}</span>
                    {' performed '}
                    <Badge variant="secondary" className={cn('text-xs', colorClass)}>
                      {entry.action.replace(/_/g, ' ')}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target: {entry.target_type} · <span className="font-mono">{entry.target_id.slice(0, 8)}...</span>
                    {entry.details && typeof entry.details === 'object' && entry.details.reason && (
                      <> · Reason: {entry.details.reason}</>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
}
