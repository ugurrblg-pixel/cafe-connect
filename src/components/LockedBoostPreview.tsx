import { Lock, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LockedBoostPreviewProps {
  count?: number;
  onUpgradeClick?: () => void;
}

export function LockedBoostPreview({ count = 2, onUpgradeClick }: LockedBoostPreviewProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate('/subscription');
    }
  };

  return (
    <div className="space-y-3">
      {/* Blurred preview cards */}
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-2xl p-[2px] bg-gradient-to-br from-amber-400/50 via-orange-500/50 to-purple-600/50"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{ 
                animation: `shimmer 3s infinite`,
                animationDelay: `${index * 500}ms` 
              }}
            />
          </div>

          <div className="relative bg-card/95 backdrop-blur-sm rounded-[14px] p-4">
            {/* Blur overlay */}
            <div className="absolute inset-0 backdrop-blur-md z-10 rounded-[14px] bg-card/60" />
            
            {/* Content (blurred) */}
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-300 to-purple-400" />
              
              {/* Info placeholder */}
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded-full w-32" />
                <div className="h-4 bg-muted/70 rounded-full w-48" />
                <div className="h-3 bg-muted/50 rounded-full w-24" />
              </div>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-background/80 px-2 py-1 rounded-full backdrop-blur-sm">
                  Boost Aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Upgrade prompt */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Boost ile kafede öne çık</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Premium kullanıcılar listeninğ en üstünde görünür
        </p>
        <Button onClick={handleUpgrade} variant="default" className="w-full">
          <Crown className="w-4 h-4 mr-2" />
          Premium'a Geç
        </Button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
