import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Eye, 
  Lock, 
  Crown,
  Coffee,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useProfileViews, ProfileView } from '@/hooks/useProfileViews';
import { usePremium } from '@/hooks/usePremium';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function BlurredViewerCard({ index }: { index: number }) {
  const gradients = [
    'from-rose-300 to-pink-400',
    'from-amber-300 to-orange-400',
    'from-violet-300 to-purple-400',
    'from-sky-300 to-blue-400',
    'from-emerald-300 to-teal-400',
    'from-fuchsia-300 to-pink-400',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ animation: `shimmer 2.5s infinite`, animationDelay: `${index * 200}ms` }}
        />
      </div>
      <div className="absolute inset-0 backdrop-blur-xl z-10 bg-white/40 dark:bg-black/40" />
      <div className="relative p-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradients[index % gradients.length]} mx-auto mb-2`} />
        <div className="space-y-1.5">
          <div className="h-3 bg-muted rounded-full w-3/4 mx-auto" />
          <div className="h-2.5 bg-muted/60 rounded-full w-1/2 mx-auto" />
        </div>
      </div>
      <div className="absolute inset-0 z-30 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function RevealedViewerCard({ view, onTap }: { view: ProfileView; onTap: () => void }) {
  const timeText = formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true, locale: tr });

  return (
    <div 
      onClick={onTap}
      className="card-elevated p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform animate-slide-up"
    >
      <div className="flex-shrink-0">
        {view.viewer_profile?.photo_url ? (
          <img
            src={view.viewer_profile.photo_url}
            alt={view.viewer_profile.display_name || ''}
            className="w-12 h-12 rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <InitialsAvatar name={view.viewer_profile?.display_name || '?'} size="sm" className="w-12 h-12" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">
          {view.viewer_profile?.display_name || 'Anonim'}
        </p>
        <p className="text-xs text-muted-foreground">{timeText}</p>
        {view.same_cafe && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
            <Coffee className="w-3 h-3" />
            Şu an seninle aynı mekanda ☕
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProfileViewers() {
  const navigate = useNavigate();
  const { views, todayCount, loading, hasMore, loadMore } = useProfileViews();
  const { isPremium } = usePremium();

  return (
    <div className="min-h-screen bg-background pb-24">
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Profilime Bakanlar</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-rose-400 to-purple-500 p-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Bugün Profiline Bakanlar</h2>
            {todayCount > 0 ? (
              <p className="text-white/90 mt-1 text-[15px]">
                Bugün <span className="font-bold">{todayCount} kişi</span> profiline baktı {todayCount >= 3 ? '🔥' : '👀'}
              </p>
            ) : (
              <p className="text-white/90 mt-1 text-[15px]">Henüz bugün görüntüleme yok</p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isPremium ? (
          /* Premium: Full viewer list */
          views.length > 0 ? (
            <div className="space-y-3">
              {views.map((view) => (
                <RevealedViewerCard
                  key={view.id}
                  view={view}
                  onTap={() => navigate(`/profile/${view.viewer_id}`)}
                />
              ))}
              {hasMore && (
                <Button variant="outline" className="w-full" onClick={loadMore}>
                  Daha fazla göster
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Henüz profilini görüntüleyen yok</p>
            </div>
          )
        ) : (
          /* Free: Blurred grid + paywall */
          <>
            {todayCount > 0 && (
              <div className="text-center py-1">
                <p className="text-sm text-muted-foreground">
                  Son 24 saat içinde profilini <span className="font-semibold text-foreground">{todayCount} kişi</span> görüntüledi 👀
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {Array.from({ length: Math.max(todayCount, 3) }).slice(0, 9).map((_, i) => (
                <BlurredViewerCard key={i} index={i} />
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Kimin baktığını görmek için Premium'a geç
            </p>

            {/* Premium CTA */}
            <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 mb-3">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg">Kimlerin baktığını gör</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto">
                  Premium ile profilini ziyaret edenleri anında öğren.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/subscription')}
              className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
            >
              <Crown className="w-5 h-5 mr-2" />
              Premium'u Keşfet
            </Button>
          </>
        )}

        {/* Trust text */}
        <div className="pt-2 pb-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/70">
              Ziyaret edenler anonimdir, bildirim gitmez.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
