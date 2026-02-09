import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { InitialsAvatar } from '@/components/InitialsAvatar';
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
import { Badge } from '@/components/ui/badge';
import { Ban, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporterName?: string;
  reportedName?: string;
  reportedPhotoUrl?: string;
}

export default function AdminReports() {
  const { user: currentUser } = useAuth();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'pending') query = query.eq('status', 'pending');
    if (filter === 'reviewed') query = query.neq('status', 'pending');

    const { data, error } = await query;
    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch profile names for reporters and reported users
    const userIds = [...new Set([...data.map(r => r.reporter_id), ...data.map(r => r.reported_user_id)])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, name, photo_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enriched = data.map(r => ({
      ...r,
      reporterName: profileMap.get(r.reporter_id)?.display_name || profileMap.get(r.reporter_id)?.name || 'Unknown',
      reportedName: profileMap.get(r.reported_user_id)?.display_name || profileMap.get(r.reported_user_id)?.name || 'Unknown',
      reportedPhotoUrl: profileMap.get(r.reported_user_id)?.photo_url || undefined,
    }));

    setReports(enriched);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const logAuditAction = async (action: string, targetId: string, details?: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUser.id,
      action,
      target_type: 'user',
      target_id: targetId,
      details,
    });
  };

  const handleDismiss = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'dismissed', reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.id })
      .eq('id', reportId);

    if (!error) {
      await logAuditAction('dismiss_report', reportId);
      toast.success('Report dismissed');
      fetchReports();
      setDetailOpen(false);
    }
  };

  const handleBanReportedUser = async () => {
    if (!selectedReport || !currentUser) return;

    // Ban user for 7 days
    await supabase.from('user_bans').insert({
      user_id: selectedReport.reported_user_id,
      ban_type: 'temporary',
      reason: `Banned via report: ${selectedReport.reason}`,
      banned_by: currentUser.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Mark report as reviewed
    await supabase
      .from('reports')
      .update({ status: 'actioned', reviewed_at: new Date().toISOString(), reviewed_by: currentUser.id })
      .eq('id', selectedReport.id);

    await logAuditAction('ban_from_report', selectedReport.reported_user_id, { report_id: selectedReport.id, reason: selectedReport.reason });

    toast.success('User banned for 7 days');
    setBanConfirmOpen(false);
    setDetailOpen(false);
    fetchReports();
  };

  const statusColor = (status: string) => {
    if (status === 'pending') return 'bg-warning/10 text-warning';
    if (status === 'actioned') return 'bg-destructive/10 text-destructive';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports & Moderation</h1>
        <p className="text-muted-foreground text-sm">Review user reports</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['pending', 'reviewed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
            )}
          >
            {f === 'pending' ? 'Pending' : f === 'reviewed' ? 'Reviewed' : 'All'}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : reports.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            {filter === 'pending' ? 'No pending reports 🎉' : 'No reports found'}
          </div>
        ) : (
          reports.map(report => (
            <div
              key={report.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => { setSelectedReport(report); setDetailOpen(true); }}
            >
              {report.reportedPhotoUrl ? (
                <img src={report.reportedPhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <InitialsAvatar name={report.reportedName || 'U'} size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground">{report.reporterName}</span>
                  {' → '}
                  <span className="font-bold">{report.reportedName}</span>
                </p>
                <p className="text-xs text-muted-foreground capitalize">{report.reason}</p>
              </div>
              <Badge variant="secondary" className={cn('text-xs', statusColor(report.status))}>
                {report.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reporter</p>
                  <p className="font-medium">{selectedReport.reporterName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reported User</p>
                  <p className="font-medium">{selectedReport.reportedName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="font-medium capitalize">{selectedReport.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
              </div>
              {selectedReport.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {selectedReport?.status === 'pending' && (
              <>
                <Button variant="ghost" onClick={() => handleDismiss(selectedReport.id)}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Dismiss
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setBanConfirmOpen(true)}
                >
                  <Ban className="w-4 h-4 mr-2" /> Ban User (7d)
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban confirmation */}
      <Dialog open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Ban
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedReport?.reportedName} for 7 days? This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBanReportedUser}>Confirm Ban</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
