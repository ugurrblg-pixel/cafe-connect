import { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, ExternalLink, RefreshCw, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created: number;
}

interface PaymentDetail {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  created: number;
  refunded: boolean;
  amount_refunded: number;
  subscriptions: Array<{
    id: string;
    status: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
  }>;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('admin-payments', {
      body: null,
      method: 'GET',
      headers: {},
    });

    // Use query params approach
    const res = await supabase.functions.invoke('admin-payments?action=list-payments&limit=50');

    if (res.error) {
      console.error('Error fetching payments:', res.error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setPayments(res.data?.payments || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const fetchDetail = async (piId: string) => {
    setDetailLoading(true);
    setDetailOpen(true);

    const res = await supabase.functions.invoke(`admin-payments?action=payment-detail&payment_intent_id=${piId}`);

    if (!res.error && res.data) {
      setSelectedPayment(res.data);
    }
    setDetailLoading(false);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      succeeded: 'bg-accent/10 text-accent',
      requires_payment_method: 'bg-warning/10 text-warning',
      requires_confirmation: 'bg-warning/10 text-warning',
      processing: 'bg-primary/10 text-primary',
      canceled: 'bg-muted text-muted-foreground',
      requires_action: 'bg-warning/10 text-warning',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      p.id.toLowerCase().includes(q) ||
      (p.customer_email || '').toLowerCase().includes(q) ||
      (p.customer_name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground text-sm">Stripe payment intents</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchPayments(); }} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} /> Refresh
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by email, name, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'succeeded', 'processing', 'canceled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize',
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
            )}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No payments found
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => fetchDetail(p.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.customer_name || p.customer_email || 'Guest'}</p>
                      <p className="text-xs text-muted-foreground">{p.customer_email || p.id.slice(0, 20) + '...'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{formatAmount(p.amount, p.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusBadge(p.status))}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created * 1000).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-foreground text-lg">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', statusBadge(selectedPayment.status))}>{selectedPayment.status}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium text-foreground">{selectedPayment.customer_name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{selectedPayment.customer_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{new Date(selectedPayment.created * 1000).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Payment Intent ID</p>
                  <p className="font-mono text-xs text-foreground break-all">{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer ID</p>
                  <p className="font-mono text-xs text-foreground">{selectedPayment.customer_id || 'N/A'}</p>
                </div>
                {selectedPayment.refunded && (
                  <div>
                    <p className="text-xs text-muted-foreground">Refunded</p>
                    <p className="text-destructive font-medium">{formatAmount(selectedPayment.amount_refunded, selectedPayment.currency)}</p>
                  </div>
                )}
              </div>

              {selectedPayment.subscriptions.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Subscriptions</p>
                  {selectedPayment.subscriptions.map(sub => (
                    <div key={sub.id} className="bg-muted/50 p-2 rounded-lg text-xs">
                      <p className="font-mono">{sub.id}</p>
                      <p>Status: <span className="font-medium">{sub.status}</span></p>
                      {sub.cancel_at_period_end && <p className="text-destructive">Cancels at period end</p>}
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`https://dashboard.stripe.com/payments/${selectedPayment.id}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Open in Stripe Dashboard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}