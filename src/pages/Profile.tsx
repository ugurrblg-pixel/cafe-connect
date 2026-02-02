import { useState } from 'react';
import { Header } from '@/components/Header';
import { PurposeBadge } from '@/components/PurposeBadge';
import { currentUser } from '@/data/mockData';
import { Purpose } from '@/types';
import { Camera, Edit2, Shield, Bell, HelpCircle, LogOut, MessageCircle, Users, Heart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Profile() {
  const [user, setUser] = useState(currentUser);
  const [allowDMs, setAllowDMs] = useState(user.allowDMs);

  const purposes: { value: Purpose; label: string; icon: React.ReactNode }[] = [
    { value: 'chat', label: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
    { value: 'friendship', label: 'Friendship', icon: <Users className="w-4 h-4" /> },
    { value: 'dating', label: 'Dating', icon: <Heart className="w-4 h-4" /> },
  ];

  const handlePurposeChange = (purpose: Purpose) => {
    setUser({ ...user, purpose });
    toast.success(`Purpose updated to ${purpose}`);
  };

  const handleDMToggle = (enabled: boolean) => {
    setAllowDMs(enabled);
    toast.success(enabled ? 'Direct messages enabled' : 'Direct messages disabled');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profile" showMenu />

      <main className="pt-16 px-4">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-6 animate-scale-in">
          <div className="relative mb-4">
            <img
              src={user.photoUrl}
              alt={user.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-card shadow-lg"
            />
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {user.name}, {user.age}
          </h1>
          <PurposeBadge purpose={user.purpose} />
        </div>

        {/* Bio Section */}
        <section className="card-elevated p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">About</h2>
            <button className="text-primary p-1">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-muted-foreground">{user.bio}</p>
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
                  user.purpose === value
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
            <Switch checked={allowDMs} onCheckedChange={handleDMToggle} />
          </div>
        </section>

        {/* Settings Links */}
        <section className="card-elevated overflow-hidden">
          {[
            { icon: Shield, label: 'Safety & Privacy', color: 'text-accent' },
            { icon: Bell, label: 'Notifications', color: 'text-primary' },
            { icon: HelpCircle, label: 'Help & Support', color: 'text-muted-foreground' },
            { icon: LogOut, label: 'Log Out', color: 'text-destructive' },
          ].map(({ icon: Icon, label, color }, index) => (
            <button
              key={label}
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
