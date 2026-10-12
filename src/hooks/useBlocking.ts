import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ReportReason = 'spam' | 'harassment' | 'inappropriate';
interface BlockedUser { id: string; blockedId: string; createdAt: Date }

export function useBlocking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const generation = useRef(0);
  const request = useRef(0);
  const mutationBusy = useRef(false);

  const refreshBlocks = useCallback(async () => {
    const scope = generation.current;
    const sequence = ++request.current;
    if (!user) return;
    const { data, error } = await supabase.rpc('list_own_blocks');
    if (scope !== generation.current || sequence !== request.current) return;
    if (error) { setBlockedUsers([]); setListError(true); throw error; }
    setBlockedUsers((data || []).map(row => ({ id: row.id, blockedId: row.blocked_id, createdAt: new Date(row.created_at) })));
    setListError(false);
  }, [user?.id]);

  useEffect(() => {
    const scope = ++generation.current;
    setBlockedUsers([]); setListError(false); setListLoading(!!user);
    mutationBusy.current = false; setLoading(false);
    if (user) void refreshBlocks().catch(() => {}).finally(() => {
      if (scope === generation.current) setListLoading(false);
    });
    return () => { ++generation.current; ++request.current; };
  }, [refreshBlocks]);

  const isBlocked = useCallback((userId: string) => blockedUsers.some(row => row.blockedId === userId), [blockedUsers]);
  const changeBlock = async (targetUserId: string, blocked: boolean): Promise<boolean> => {
    if (!user || mutationBusy.current) return false;
    const scope = generation.current;
    mutationBusy.current = true; setLoading(true);
    try {
      const { error } = await supabase.rpc('set_own_block', { target_user_id: targetUserId, blocked });
      if (scope !== generation.current) return false;
      if (error) throw error;
      try { await refreshBlocks(); } catch {
        toast.warning('İşlem kaydedildi, engel listesi yenilenemedi. Sayfayı yenileyin.');
        return true;
      }
      if (scope !== generation.current) return false;
      toast.success(blocked ? 'Kullanıcı engellendi' : 'Engel kaldırıldı');
      return true;
    } catch {
      if (scope === generation.current) toast.error(blocked ? 'Engelleme başarısız' : 'Engel kaldırılamadı');
      return false;
    } finally {
      if (scope === generation.current) { mutationBusy.current = false; setLoading(false); }
    }
  };
  const blockUser = (targetUserId: string) => changeBlock(targetUserId, true);
  const unblockUser = (targetUserId: string) => changeBlock(targetUserId, false);

  const reportUser = async (
    reportedUserId: string, 
    reason: ReportReason, 
    description?: string,
    _conversationId?: string
  ): Promise<boolean> => {
    if (!user || mutationBusy.current) return false;
    if (import.meta.env.VITE_REPORTS_ENABLED !== 'true') {
      toast.error('Şikâyet özelliği henüz kullanıma açılmadı. Kullanıcıyı engelleyebilirsiniz.');
      return false;
    }
    const scope = generation.current;
    mutationBusy.current = true; setLoading(true);
    try {
      const { data, error } = await supabase.rpc('submit_own_report', {
        target_user_id: reportedUserId, report_reason: reason,
        report_description: description?.trim() || null,
      });
      if (scope !== generation.current) return false;
      if (error || !data) throw error || new Error('Missing report receipt');
      toast.success('Şikâyetiniz kaydedildi');
      return true;
    } catch {
      if (scope === generation.current) toast.error('Şikâyet kaydedilemedi. Daha sonra tekrar deneyin.');
      return false;
    } finally {
      if (scope === generation.current) { mutationBusy.current = false; setLoading(false); }
    }
  };

  return { 
    blockUser, 
    unblockUser, 
    reportUser, 
    isBlocked,
    blockedUsers,
    listLoading,
    listError,
    loading 
  };
}
