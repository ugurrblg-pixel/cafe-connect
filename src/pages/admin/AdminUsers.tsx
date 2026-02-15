import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { InitialsAvatar } from '@/components/InitialsAvatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Ban, AlertTriangle, ShieldOff, Eye, EyeOff, ImageOff, Trash2, Crown, CrownIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserRow {
  user_id: string;
  display_name: string | null;
  name: string;
  photo_url: string | null;
  purpose: string;
  created_at: string;
  bio: string | null;
  hobbies: string[] | null;
  photo_urls: string[] | null;
  age: number | null;
  is_visible: boolean | null;
}

interface BanInfo {
  is_active: boolean;
  ban_type: string;
  expires_at: string | null;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banDuration, setBanDuration] = useState<'24h' | '7d' | 'permanent'>('24h');
  const [banReason, setBanReason] = useState('');
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [warnReason, setWarnReason] = useState('');
  const [bans, setBans] = useState<Record<string, BanInfo>>({});
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ userId: string; photoUrl: string; index: number } | null>(null);
  const [softDeleteTarget, setSoftDeleteTarget] = useState<UserRow | null>(null);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [premiumPlanType, setPremiumPlanType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [premiumDuration, setPremiumDuration] = useState<'1m' | '3m' | '6m' | '1y' | 'unlimited'>('1m');
  const [subscriptionStatus, setSubscriptionStatus] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, name, photo_url, purpose, created_at, bio, hobbies, photo_urls, age, is_visible')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      setUsers(data);

      const userIds = data.map(u => u.user_id);
      const { data: banData } = await supabase
        .from('user_bans')
        .select('user_id, is_active, ban_type, expires_at')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (banData) {
        const banMap: Record<string, BanInfo> = {};
        banData.forEach(b => {
          if (!b.expires_at || new Date(b.expires_at) > new Date()) {
            banMap[b.user_id] = { is_active: b.is_active, ban_type: b.ban_type, expires_at: b.expires_at };
          }
        });
        setBans(banMap);
      }
      // Fetch subscription status
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('user_id, status, expires_at')
        .in('user_id', userIds)
        .eq('status', 'active');

      if (subData) {
        const subMap: Record<string, boolean> = {};
        subData.forEach(s => {
          if (!s.expires_at || new Date(s.expires_at) > new Date()) {
            subMap[s.user_id] = true;
          }
        });
        setSubscriptionStatus(subMap);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (u.display_name || '').toLowerCase().includes(q)
      || u.name.toLowerCase().includes(q)
      || u.user_id.toLowerCase().includes(q);
  });

  const logAuditAction = async (action: string, targetId: string, targetType: string = 'user', details?: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: currentUser.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  };

  const handleBan = async () => {
    if (!selectedUser || !currentUser) return;

    const expiresAt = banDuration === '24h'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : banDuration === '7d'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error } = await supabase.from('user_bans').insert({
      user_id: selectedUser.user_id,
      ban_type: banDuration === 'permanent' ? 'permanent' : 'temporary',
      reason: banReason,
      banned_by: currentUser.id,
      expires_at: expiresAt,
    });

    if (!error) {
      await logAuditAction('ban_user', selectedUser.user_id, 'user', { duration: banDuration, reason: banReason });
      toast.success(`User banned (${banDuration})`);
      setBanDialogOpen(false);
      setBanReason('');
      fetchUsers();
    } else {
      toast.error('Failed to ban user');
    }
  };

  const handleUnban = async (userId: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('user_bans')
      .update({ is_active: false, unbanned_by: currentUser.id, unbanned_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!error) {
      await logAuditAction('unban_user', userId);
      toast.success('User unbanned');
      fetchUsers();
    }
  };

  const handleWarn = async () => {
    if (!selectedUser || !currentUser) return;

    const { error } = await supabase.from('user_warnings').insert({
      user_id: selectedUser.user_id,
      reason: warnReason,
      warned_by: currentUser.id,
    });

    if (!error) {
      await logAuditAction('warn_user', selectedUser.user_id, 'user', { reason: warnReason });
      toast.success('Warning sent');
      setWarnDialogOpen(false);
      setWarnReason('');
    } else {
      toast.error('Failed to send warning');
    }
  };

  const handleDeletePhoto = async () => {
    if (!deletePhotoTarget || !currentUser) return;

    const targetUser = users.find(u => u.user_id === deletePhotoTarget.userId);
    if (!targetUser) return;

    const updatedPhotos = (targetUser.photo_urls || []).filter((_, i) => i !== deletePhotoTarget.index);
    const newPrimaryPhoto = updatedPhotos.length > 0 ? updatedPhotos[0] : '';

    const { error } = await supabase
      .from('profiles')
      .update({ photo_urls: updatedPhotos, photo_url: newPrimaryPhoto })
      .eq('user_id', deletePhotoTarget.userId);

    if (!error) {
      await logAuditAction('delete_photo', deletePhotoTarget.userId, 'photo', { removed_url: deletePhotoTarget.photoUrl });
      toast.success('Photo removed');
      setDeletePhotoTarget(null);
      fetchUsers();
      // Refresh profile dialog if open
      if (selectedUser?.user_id === deletePhotoTarget.userId) {
        const updated = { ...selectedUser, photo_urls: updatedPhotos, photo_url: newPrimaryPhoto };
        setSelectedUser(updated);
      }
    } else {
      toast.error('Failed to remove photo');
    }
  };

  const handleSoftDelete = async () => {
    if (!softDeleteTarget || !currentUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_visible: false, display_name: '[Deleted User]', bio: '' })
      .eq('user_id', softDeleteTarget.user_id);

    if (!error) {
      await logAuditAction('soft_delete_user', softDeleteTarget.user_id, 'user');
      toast.success('User soft-deleted (hidden from app)');
      setSoftDeleteTarget(null);
      fetchUsers();
    } else {
      toast.error('Failed to soft-delete user');
    }
  };

  const handleGrantPremium = async () => {
    if (!selectedUser || !currentUser) return;

    const durationMap: Record<string, number> = {
      '1m': 30, '3m': 90, '6m': 180, '1y': 365, 'unlimited': 3650,
    };
    const days = durationMap[premiumDuration];
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    // Check if subscription exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', selectedUser.user_id)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('subscriptions')
        .update({
          plan_type: premiumPlanType,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          platform: 'admin_granted',
          store: 'admin',
        })
        .eq('user_id', selectedUser.user_id));
    } else {
      ({ error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: selectedUser.user_id,
          plan_type: premiumPlanType,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          platform: 'admin_granted',
          store: 'admin',
        }));
    }

    if (!error) {
      await logAuditAction('grant_premium', selectedUser.user_id, 'subscription', {
        plan_type: premiumPlanType,
        duration: premiumDuration,
        expires_at: expiresAt,
      });
      toast.success(`Premium granted to ${selectedUser.display_name || selectedUser.name}`);
      setPremiumDialogOpen(false);
      fetchUsers();
    } else {
      toast.error('Failed to grant premium: ' + error.message);
    }
  };

  const handleRevokePremium = async (userId: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', expires_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (!error) {
      await logAuditAction('revoke_premium', userId, 'subscription');
      toast.success('Premium revoked');
      fetchUsers();
    } else {
      toast.error('Failed to revoke premium');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm">{users.length} users total</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purpose</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isBanned = !!bans[u.user_id];
                  const isHidden = u.is_visible === false;
                  const isPremiumUser = !!subscriptionStatus[u.user_id];
                  const displayName = u.display_name || u.name || 'Anonymous';
                  return (
                    <tr key={u.user_id} className={cn(
                      "border-b border-border hover:bg-muted/30 transition-colors",
                      isHidden && "opacity-50"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.photo_url ? (
                            <img src={u.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <InitialsAvatar name={displayName} size="sm" />
                          )}
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-1.5">
                              {displayName}
                              {isPremiumUser && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                              {isHidden && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                          {u.purpose}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isBanned ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                            Banned
                          </span>
                        ) : isHidden ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                            Hidden
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setProfileOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setWarnDialogOpen(true); }}>
                              <AlertTriangle className="w-4 h-4 mr-2" /> Warn
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isPremiumUser ? (
                              <DropdownMenuItem onClick={() => handleRevokePremium(u.user_id)} className="text-destructive focus:text-destructive">
                                <Crown className="w-4 h-4 mr-2" /> Revoke Premium
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setPremiumDialogOpen(true); }}>
                                <Crown className="w-4 h-4 mr-2" /> Grant Premium
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {isBanned ? (
                              <DropdownMenuItem onClick={() => handleUnban(u.user_id)}>
                                <ShieldOff className="w-4 h-4 mr-2" /> Unban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => { setSelectedUser(u); setBanDialogOpen(true); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="w-4 h-4 mr-2" /> Ban
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setSoftDeleteTarget(u)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Soft Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile View Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedUser.photo_url ? (
                  <img src={selectedUser.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <InitialsAvatar name={selectedUser.display_name || selectedUser.name} size="md" />
                )}
                <div>
                  <p className="font-bold text-foreground">{selectedUser.display_name || selectedUser.name}</p>
                  {selectedUser.age && <p className="text-sm text-muted-foreground">{selectedUser.age} years old</p>}
                  <p className="text-xs text-muted-foreground capitalize">{selectedUser.purpose}</p>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm text-foreground">{selectedUser.bio}</p>
                </div>
              )}

              {selectedUser.hobbies && selectedUser.hobbies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Hobbies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.hobbies.map(h => (
                      <span key={h} className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground">{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedUser.photo_urls && selectedUser.photo_urls.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Photos ({selectedUser.photo_urls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedUser.photo_urls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="rounded-lg object-cover aspect-square w-full" />
                        <button
                          onClick={() => setDeletePhotoTarget({ userId: selectedUser.user_id, photoUrl: url, index: i })}
                          className="absolute top-1 right-1 p-1 bg-destructive/90 rounded-md text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove photo"
                        >
                          <ImageOff className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">User ID</p>
                <p className="text-xs text-muted-foreground font-mono break-all">{selectedUser.user_id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.display_name || selectedUser?.name}. This will prevent them from using the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['24h', '7d', 'permanent'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setBanDuration(d)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                    banDuration === d
                      ? 'bg-destructive text-destructive-foreground border-destructive'
                      : 'bg-secondary text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {d === '24h' ? '24 Hours' : d === '7d' ? '7 Days' : 'Permanent'}
                </button>
              ))}
            </div>
            <Input
              placeholder="Reason for ban..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBan} disabled={!banReason.trim()}>
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warn User</DialogTitle>
            <DialogDescription>
              Send a warning to {selectedUser?.display_name || selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Warning reason..."
            value={warnReason}
            onChange={(e) => setWarnReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWarnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleWarn} disabled={!warnReason.trim()}>
              Send Warning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Photo Confirmation */}
      <Dialog open={!!deletePhotoTarget} onOpenChange={() => setDeletePhotoTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Photo
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this photo from the user's profile. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          {deletePhotoTarget && (
            <div className="flex justify-center">
              <img src={deletePhotoTarget.photoUrl} alt="" className="rounded-lg max-h-48 object-cover" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletePhotoTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePhoto}>Remove Photo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Confirmation */}
      <Dialog open={!!softDeleteTarget} onOpenChange={() => setSoftDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Soft Delete User
            </DialogTitle>
            <DialogDescription>
              This will hide {softDeleteTarget?.display_name || softDeleteTarget?.name} from the app. Their data will be preserved but they won't appear in discovery or search. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSoftDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSoftDelete}>Soft Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Premium Dialog */}
      <Dialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Grant Premium
            </DialogTitle>
            <DialogDescription>
              Grant premium subscription to {selectedUser?.display_name || selectedUser?.name}. This will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Plan Type</label>
              <Select value={premiumPlanType} onValueChange={(v) => setPremiumPlanType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Duration</label>
              <Select value={premiumDuration} onValueChange={(v) => setPremiumDuration(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Month</SelectItem>
                  <SelectItem value="3m">3 Months</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="unlimited">Unlimited (10 years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPremiumDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGrantPremium}>
              <Crown className="w-4 h-4 mr-2" />
              Grant Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}