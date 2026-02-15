import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, User, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VerificationRequest {
  id: string;
  user_id: string;
  display_name: string;
  name: string;
  photo_url: string | null;
  verification_selfie_url: string | null;
  verification_status: string;
  verification_requested_at: string | null;
}

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminVerification() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const logAudit = async (action: string, targetId: string, details?: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUser.id,
      action,
      target_type: 'verification',
      target_id: targetId,
      details,
    });
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, name, photo_url, verification_selfie_url, verification_status, verification_requested_at')
      .eq('verification_status', tab)
      .order('verification_requested_at', { ascending: tab === 'pending' })
      .limit(50);

    if (!error && data) {
      setRequests(data as VerificationRequest[]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (profileId: string, userId: string, action: 'approved' | 'rejected') => {
    setActionLoading(profileId);
    
    const updates: any = {
      verification_status: action,
    };

    if (action === 'approved') {
      updates.is_verified = true;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId);

    if (error) {
      toast.error('İşlem başarısız');
    } else {
      await logAudit(`verification_${action}`, userId, { profile_id: profileId });
      toast.success(action === 'approved' ? 'Kullanıcı doğrulandı ✓' : 'Doğrulama reddedildi');
      fetchRequests();
    }
    setActionLoading(null);
  };

  const tabs: { key: Tab; label: string; icon: typeof Clock }[] = [
    { key: 'pending', label: 'Bekleyen', icon: Clock },
    { key: 'approved', label: 'Onaylanan', icon: CheckCircle2 },
    { key: 'rejected', label: 'Reddedilen', icon: XCircle },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kullanıcı Doğrulama</h1>
        <p className="text-muted-foreground text-sm">Selfie doğrulama taleplerini yönetin</p>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-muted'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Bu kategoride doğrulama talebi yok
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-4">
                {/* Profile photo */}
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {req.photo_url ? (
                    <img src={req.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{req.display_name || req.name || 'İsimsiz'}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.verification_requested_at 
                      ? new Date(req.verification_requested_at).toLocaleString('tr-TR')
                      : 'Tarih bilinmiyor'}
                  </p>
                  
                  {/* Selfie preview */}
                  {req.verification_selfie_url && (
                    <a
                      href={req.verification_selfie_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Selfie'yi görüntüle
                    </a>
                  )}
                </div>

                {/* Actions */}
                {tab === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={actionLoading === req.id}
                      onClick={() => handleAction(req.id, req.user_id, 'rejected')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionLoading === req.id}
                      onClick={() => handleAction(req.id, req.user_id, 'approved')}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Onayla
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
