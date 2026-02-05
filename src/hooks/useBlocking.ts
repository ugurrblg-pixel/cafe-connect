import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useBlocking() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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
      toast.error('Failed to block user');
      setLoading(false);
      return false;
    }

    // Deactivate any conversations with this user
    await supabase
      .from('conversations')
      .update({ is_active: false })
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${blockedUserId}),and(user1_id.eq.${blockedUserId},user2_id.eq.${user.id})`);

    setLoading(false);
    toast.success('User blocked');
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
      toast.error('Failed to unblock user');
      return false;
    }

    toast.success('User unblocked');
    return true;
  };

  const reportUser = async (reportedUserId: string, reason: string): Promise<boolean> => {
    // For now, just show a toast. In production, you'd want to store reports.
    toast.success('Report submitted', {
      description: 'Thank you for helping keep our community safe.',
    });
    return true;
  };

  return { blockUser, unblockUser, reportUser, loading };
}
