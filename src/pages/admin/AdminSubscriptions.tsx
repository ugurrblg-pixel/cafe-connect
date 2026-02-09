import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RefreshCw, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubscriptionRow {
  id: string;
  status: string;
  customer_id: string;
  customer_email: string | null;
  customer_name: string | null;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  created: number;
  price_id: string | null;
  product_id: string | null;
  amount: number | null;
  currency: string | null;
  interval: string | null;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    const res = await supabase.functions.invoke(`admin-payments?action=list-subscriptions&status=${statusFilter}`);

    if (res.error) {
      console.error('Error fetching subscriptions:', res.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setSubscriptions(res.data?.subscriptions || []);
    setLoading(false);
    setRefreshing(false);
  }, [statusFilter]);

  useEffect(() => { setLoading(true); fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);

    const res = await supabase.functions.invoke(`admin-payments?action=cancel-subscription&subscription_id=${cancelTarget.id}`);

    if (res.error) {
      toast.error('Failed to cancel subscription');
    } else {
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    }
    setCancelling(false);
    setCancelTarget(null);
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-accent/10 text-accent',
      canceled: 'bg-destructive/10 text-destructive',
      past_due: 'bg-warning/10 text-warning',
      trialing: 'bg-primary/10 text-primary',
      incomplete: 'bg-warning/10 text-warning',
      unpaid: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground text-sm">Manage Stripe subscriptions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchSubscriptions(); }} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['all', 'active', 'canceled', 'past_due', 'trialing'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
            statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
          )}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Auto-Renew</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
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
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No subscriptions found</td>
                </tr>
              ) : (
                subscriptions.map(sub => (
                  <tr key={sub.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{sub.customer_name || sub.customer_email || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{sub.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{formatAmount(sub.amount, sub.currency)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sub.interval || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusBadge(sub.status))}>{sub.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(sub.current_period_end * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium', sub.cancel_at_period_end ? 'text-destructive' : 'text-accent')}>
                        {sub.cancel_at_period_end ? 'No' : 'Yes'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sub.status === 'active' && (
                        <button
                          onClick={() => setCancelTarget(sub)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          title="Cancel subscription"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Cancel subscription for {cancelTarget?.customer_name || cancelTarget?.customer_email}? This will immediately cancel via Stripe and be logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}