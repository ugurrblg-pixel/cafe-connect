import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { PurposeBadge } from '@/components/PurposeBadge';
import { PaywallModal } from '@/components/PaywallModal';
import { useProfileViews } from '@/hooks/useProfileViews';
import { usePremium } from '@/hooks/usePremium';
import { Skeleton } from '@/components/ui/skeleton';
import { Purpose } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ProfileViewers() {
  const navigate = useNavigate();
  const { views, viewCount, loading } = useProfileViews();
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Profil Görüntüleyenler</h1>
          </div>
          {isPremium && (
            <span className="ml-auto text-sm text-muted-foreground">
              {viewCount} kişi
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !isPremium ? (
          // Locked state for non-premium users
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Profilini kim görüntüledi?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Premium üyelikle seni görüntüleyen herkesi görebilirsin
            </p>
            
            {/* Blurred preview */}
            <div className="w-full max-w-sm space-y-3 mb-6 blur-sm opacity-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl">
                  <div className="w-14 h-14 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-secondary rounded mb-2" />
                    <div className="h-4 w-24 bg-secondary rounded" />
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => setShowPaywall(true)} className="w-full max-w-xs">
              <Crown className="w-5 h-5 mr-2" />
              Premium'a Geç
            </Button>
          </div>
        ) : views.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <Eye className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Henüz görüntüleme yok
            </h2>
            <p className="text-muted-foreground max-w-xs">
              Bir kafeye check-in yaparak profilini daha fazla kişiye göster
            </p>
          </div>
        ) : (
          // Viewer list
          <div className="space-y-3">
            {views.map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-4 p-4 bg-card rounded-2xl"
              >
                {view.viewer_profile?.photo_url ? (
                  <img
                    src={view.viewer_profile.photo_url}
                    alt={view.viewer_profile.display_name || 'User'}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <InitialsAvatar 
                    name={view.viewer_profile?.display_name || 'Anonymous'} 
                    size="md" 
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {view.viewer_profile?.display_name || 'Anonymous'}
                    </h3>
                    {view.viewer_profile?.purpose && (
                      <PurposeBadge 
                        purpose={view.viewer_profile.purpose as Purpose} 
                        size="sm" 
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(view.viewed_at), { 
                      addSuffix: true,
                      locale: tr 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="profile_views"
      />
    </div>
  );
}
