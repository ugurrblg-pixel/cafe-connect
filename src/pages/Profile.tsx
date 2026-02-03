import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { PurposeBadge } from '@/components/PurposeBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Purpose } from '@/types';
import { Camera, Edit2, Shield, Bell, HelpCircle, LogOut, MessageCircle, Users, Heart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  name: string;
  age: number | null;
  bio: string;
  photo_url: string;
  purpose: Purpose;
  allow_dms: boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile({
          id: data.id,
          name: data.name || user.user_metadata?.name || 'Anonymous',
          age: data.age,
          bio: data.bio || '',
          photo_url: data.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
          purpose: data.purpose as Purpose,
          allow_dms: data.allow_dms,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const purposes: { value: Purpose; label: string; icon: React.ReactNode }[] = [
    { value: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'friendship', label: 'Friendship', icon: <Users className="w-4 h-4" /> },
    { value: 'dating', label: 'Dating', icon: <Heart className="w-4 h-4" /> },
  ];

  const handlePurposeChange = async (purpose: Purpose) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ purpose })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update purpose');
      return;
    }

    setProfile({ ...profile, purpose });
    toast.success(`Purpose updated to ${purpose}`);
  };

  const handleDMToggle = async (enabled: boolean) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update({ allow_dms: enabled })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to update DM settings');
      return;
    }

    setProfile({ ...profile, allow_dms: enabled });
    toast.success(enabled ? 'Direct messages enabled' : 'Direct messages disabled');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title="Profile" showMenu />
        <main className="pt-16 px-4">
          <div className="flex flex-col items-center py-6">
            <Skeleton className="w-28 h-28 rounded-full mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showMenu />

      <main className="pt-16 px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6 animate-scale-in">
          <div className="relative mb-4">
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-card shadow-lg"
            />
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {profile.name}{profile.age ? `, ${profile.age}` : ''}
          </h1>
          <PurposeBadge purpose={profile.purpose} />
        </div>

        {/* Bio Section */}
        <section className="card-elevated p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">About</h2>
            <button className="text-primary p-1">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-muted-foreground">{profile.bio || 'Add a bio to tell others about yourself'}</p>
        </section>

        {/* Purpose Selection */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">I'm here for</h2>
          <div className="flex gap-2">
            {purposes.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handlePurposeChange(value)}
                className={`flex-1 py-3 px-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  profile.purpose === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="card-elevated p-4 mb-4">
          <h2 className="font-semibold text-foreground mb-4">Privacy</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Allow Direct Messages</p>
                <p className="text-sm text-muted-foreground">Let others message you</p>
              </div>
            </div>
            <Switch checked={profile.allow_dms} onCheckedChange={handleDMToggle} />
          </div>
        </section>

        {/* Settings Links */}
        <section className="card-elevated overflow-hidden">
          {[
            { icon: Shield, label: 'Safety & Privacy', color: 'text-accent', onClick: () => {} },
            { icon: Bell, label: 'Notifications', color: 'text-primary', onClick: () => {} },
            { icon: HelpCircle, label: 'Help & Support', color: 'text-muted-foreground', onClick: () => {} },
            { icon: LogOut, label: 'Log Out', color: 'text-destructive', onClick: handleLogout },
          ].map(({ icon: Icon, label, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="font-medium text-foreground">{label}</span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
