import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { PageLayout } from '@/components/PageLayout';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle, Heart, MapPin, Crown, Loader2 } from 'lucide-react';

interface NotificationPrefs {
  new_messages: boolean;
  new_matches: boolean;
  nearby_cafes: boolean;
  premium_promotions: boolean;
}

const defaultPrefs: NotificationPrefs = {
  new_messages: true,
  new_matches: true,
  nearby_cafes: false,
  premium_promotions: false,
};

export default function NotificationSettings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      // For now we use the single notifications_enabled as a master toggle.
      // Individual prefs are stored in localStorage until we add DB columns.
      const stored = localStorage.getItem(`notif_prefs_${user.id}`);
      if (stored) {
        try {
          setPrefs(JSON.parse(stored));
        } catch {
          setPrefs(defaultPrefs);
        }
      }
      setLoading(false);
    };

    fetchPrefs();
  }, [user]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!user) return;
    setSaving(true);

    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    // Persist to localStorage
    localStorage.setItem(`notif_prefs_${user.id}`, JSON.stringify(updated));

    // If all off, disable master toggle
    const allOff = !updated.new_messages && !updated.new_matches && !updated.nearby_cafes && !updated.premium_promotions;
    await supabase
      .from('profiles')
      .update({ notifications_enabled: !allOff })
      .eq('user_id', user.id);

    setSaving(false);
    toast.success('Bildirim ayarları güncellendi');
  };

  const toggleItems: {
    key: keyof NotificationPrefs;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'new_messages',
      label: 'Yeni Mesajlar',
      description: 'Yeni mesaj geldiğinde bildirim al',
      icon: <MessageCircle className="w-5 h-5 text-primary" />,
    },
    {
      key: 'new_matches',
      label: 'Yeni Eşleşmeler',
      description: 'Biri seninle eşleştiğinde bildirim al',
      icon: <Heart className="w-5 h-5 text-destructive" />,
    },
    {
      key: 'nearby_cafes',
      label: 'Yakındaki Kafeler',
      description: 'Yakınında popüler kafeler olduğunda bildir',
      icon: <MapPin className="w-5 h-5 text-accent" />,
    },
    {
      key: 'premium_promotions',
      label: 'Premium & Kampanyalar',
      description: 'Özel teklifler ve kampanya bildirimleri',
      icon: <Crown className="w-5 h-5 text-warning" />,
    },
  ];

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background pb-24">
          <Header title="Bildirimler" showBack />
          <main className="pt-16 px-4 flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </main>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-background pb-24">
        <Header title="Bildirimler" showBack />

        <main className="pt-16 px-4">
          <section className="card-elevated overflow-hidden">
            {toggleItems.map(({ key, label, description, icon }, idx) => (
              <div
                key={key}
                className={`flex items-center justify-between p-4 ${
                  idx < toggleItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {icon}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(v) => updatePref(key, v)}
                  disabled={saving}
                />
              </div>
            ))}
          </section>

          <p className="text-xs text-muted-foreground text-center mt-4 px-4">
            Bildirimleri tamamen kapatmak için tüm seçenekleri devre dışı bırakın.
          </p>
        </main>
      </div>
    </PageLayout>
  );
}
