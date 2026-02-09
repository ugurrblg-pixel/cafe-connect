import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
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
import { Search, Trash2, MessageCircle, Heart, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'conversations' | 'matches';

interface ConversationRow {
  id: string;
  user1_id: string;
  user2_id: string;
  cafe_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user1Name?: string;
  user2Name?: string;
}

interface MatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
  cafe_id: string;
  created_at: string;
  user1Name?: string;
  user2Name?: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  senderName?: string;
}

export default function AdminModeration() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('conversations');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: Tab; id: string; label: string } | null>(null);

  // Message viewer state
  const [viewingConvo, setViewingConvo] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState<MessageRow | null>(null);

  const logAudit = async (action: string, targetType: string, targetId: string, details?: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUser.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  };

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error || !data) { setLoading(false); return; }

    const userIds = [...new Set(data.flatMap(c => [c.user1_id, c.user2_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, name')
      .in('user_id', userIds);

    const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.name || 'Unknown']) || []);

    setConversations(data.map(c => ({
      ...c,
      user1Name: nameMap.get(c.user1_id) || 'Unknown',
      user2Name: nameMap.get(c.user2_id) || 'Unknown',
    })));
    setLoading(false);
  }, []);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) { setLoading(false); return; }

    const userIds = [...new Set(data.flatMap(m => [m.user1_id, m.user2_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, name')
      .in('user_id', userIds);

    const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.name || 'Unknown']) || []);

    setMatches(data.map(m => ({
      ...m,
      user1Name: nameMap.get(m.user1_id) || 'Unknown',
      user2Name: nameMap.get(m.user2_id) || 'Unknown',
    })));
    setLoading(false);
  }, []);

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, deleted_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error || !data) { setMessagesLoading(false); return; }

    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, name')
      .in('user_id', senderIds);

    const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name || p.name || 'Unknown']) || []);

    setMessages(data.map(m => ({
      ...m,
      senderName: nameMap.get(m.sender_id) || 'Unknown',
    })));
    setMessagesLoading(false);
  };

  useEffect(() => {
    if (tab === 'conversations') fetchConversations();
    else fetchMatches();
  }, [tab, fetchConversations, fetchMatches]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'conversations') {
      const { error } = await supabase
        .from('conversations')
        .update({ is_active: false })
        .eq('id', deleteTarget.id);

      if (!error) {
        await logAudit('delete_conversation', 'conversation', deleteTarget.id);
        toast.success('Conversation deactivated');
        fetchConversations();
      } else {
        toast.error('Failed to deactivate conversation');
      }
    } else {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', deleteTarget.id);

      if (!error) {
        await logAudit('delete_match', 'match', deleteTarget.id);
        toast.success('Match deleted');
        fetchMatches();
      } else {
        toast.error('Failed to delete match');
      }
    }
    setDeleteTarget(null);
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageTarget) return;

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteMessageTarget.id);

    if (!error) {
      await logAudit('delete_message', 'message', deleteMessageTarget.id, {
        conversation_id: viewingConvo?.id,
        content_preview: deleteMessageTarget.content.slice(0, 50),
      });
      toast.success('Message deleted');
      setDeleteMessageTarget(null);
      if (viewingConvo) fetchMessages(viewingConvo.id);
    } else {
      toast.error('Failed to delete message');
    }
  };

  const filteredConversations = conversations.filter(c => {
    const q = search.toLowerCase();
    return (c.user1Name || '').toLowerCase().includes(q) || (c.user2Name || '').toLowerCase().includes(q);
  });

  const filteredMatches = matches.filter(m => {
    const q = search.toLowerCase();
    return (m.user1Name || '').toLowerCase().includes(q) || (m.user2Name || '').toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Chat & Match Moderation</h1>
        <p className="text-muted-foreground text-sm">Manage conversations, messages, and matches</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: 'conversations' as Tab, label: 'Conversations', icon: MessageCircle },
          { key: 'matches' as Tab, label: 'Matches', icon: Heart },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(''); }}
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by user name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tab === 'conversations' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Users</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Activity</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConversations.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No conversations found</td></tr>
                ) : (
                  filteredConversations.map(c => (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{c.user1Name}</span>
                        <span className="text-muted-foreground mx-1">↔</span>
                        <span className="font-medium text-foreground">{c.user2Name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                          c.is_active ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                        )}>
                          {c.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.updated_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setViewingConvo(c); fetchMessages(c.id); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                          title="View messages"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {c.is_active && (
                          <button
                            onClick={() => setDeleteTarget({ type: 'conversations', id: c.id, label: `${c.user1Name} ↔ ${c.user2Name}` })}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            title="Deactivate conversation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Users</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Matched</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No matches found</td></tr>
                ) : (
                  filteredMatches.map(m => (
                    <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{m.user1Name}</span>
                        <span className="text-muted-foreground mx-1">❤️</span>
                        <span className="font-medium text-foreground">{m.user2Name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget({ type: 'matches', id: m.id, label: `${m.user1Name} ❤️ ${m.user2Name}` })}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete match"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Viewer Dialog */}
      <Dialog open={!!viewingConvo} onOpenChange={() => setViewingConvo(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Messages
            </DialogTitle>
            <DialogDescription>
              {viewingConvo?.user1Name} ↔ {viewingConvo?.user2Name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
            {messagesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-3/4" />
              ))
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages in this conversation</p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-lg text-sm group',
                    msg.deleted_at ? 'opacity-40' : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-xs">{msg.senderName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                      {msg.deleted_at && (
                        <span className="text-xs text-destructive font-medium">[deleted]</span>
                      )}
                    </div>
                    <p className={cn('text-foreground mt-0.5', msg.deleted_at && 'line-through')}>
                      {msg.content}
                    </p>
                  </div>
                  {!msg.deleted_at && (
                    <button
                      onClick={() => setDeleteMessageTarget(msg)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <Dialog open={!!deleteMessageTarget} onOpenChange={() => setDeleteMessageTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Message
            </DialogTitle>
            <DialogDescription>
              This will soft-delete the message. It will be hidden from users but preserved for audit.
            </DialogDescription>
          </DialogHeader>
          {deleteMessageTarget && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-xs text-muted-foreground mb-1">{deleteMessageTarget.senderName}:</p>
              <p className="text-foreground">{deleteMessageTarget.content}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteMessageTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMessage}>Delete Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete conversation/match confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm {deleteTarget?.type === 'conversations' ? 'Deactivation' : 'Deletion'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'conversations'
                ? `Deactivate conversation between ${deleteTarget.label}? Messages will be preserved for audit.`
                : `Delete match between ${deleteTarget?.label}? This action will be logged.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              {deleteTarget?.type === 'conversations' ? 'Deactivate' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}