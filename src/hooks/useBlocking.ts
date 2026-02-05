import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ReportReason = 'spam' | 'harassment' | 'inappropriate';

interface BlockedUser {
  id: string;
  blockedId: string;
  createdAt: Date;
}

export function useBlocking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // Fetch blocked users on mount
  useEffect(() => {
    if (!user) {
      setBlockedUsers([]);
      return;
    }

    const fetchBlocked = async () => {
      const { data } = await supabase
        .from('user_blocks')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id);

      if (data) {
        setBlockedUsers(data.map(b => ({
          id: b.id,
          blockedId: b.blocked_id,
          createdAt: new Date(b.created_at),
        })));
      }
    };

    fetchBlocked();
  }, [user]);

  const isBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.some(b => b.blockedId === userId);
  }, [blockedUsers]);

  const blockUser = async (blockedUserId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    // Block the user
    const { error: blockError } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      });

    if (blockError && !blockError.message.includes('duplicate')) {
      console.error('Error blocking user:', blockError);
      toast.error('Engelleme başarısız');
      setLoading(false);
      return false;
    }

    // Deactivate any conversations with this user
    await supabase
      .from('conversations')
      .update({ is_active: false })
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${blockedUserId}),and(user1_id.eq.${blockedUserId},user2_id.eq.${user.id})`);

    // Update local state
    setBlockedUsers(prev => [...prev, {
      id: crypto.randomUUID(),
      blockedId: blockedUserId,
      createdAt: new Date(),
    }]);

    setLoading(false);
    toast.success('Kullanıcı engellendi');
    return true;
  };

  const unblockUser = async (blockedUserId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId);

    setLoading(false);

    if (error) {
      console.error('Error unblocking user:', error);
      toast.error('Engel kaldırılamadı');
      return false;
    }

    // Update local state
    setBlockedUsers(prev => prev.filter(b => b.blockedId !== blockedUserId));

    toast.success('Engel kaldırıldı');
    return true;
  };

  const reportUser = async (
    reportedUserId: string, 
    reason: ReportReason, 
    description?: string
  ): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        description,
      });

    setLoading(false);

    if (error) {
      console.error('Error reporting user:', error);
      toast.error('Şikayet gönderilemedi');
      return false;
    }

    toast.success('Şikayet gönderildi', {
      description: 'Güvenlik ekibimiz inceleyecektir.',
    });
    return true;
  };

  return { 
    blockUser, 
    unblockUser, 
    reportUser, 
    isBlocked,
    blockedUsers,
    loading 
  };
}
