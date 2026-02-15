import { useNavigate } from 'react-router-dom';
import { Spark } from '@/hooks/useSparks';
import { usePremium } from '@/hooks/usePremium';
import { InitialsAvatar } from './InitialsAvatar';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown, Lock, Loader2, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useState } from 'react';

interface SparkReceivedListProps {
  sparks: Spark[];
  onAccept: (sparkId: string) => Promise<{ success: boolean; conversationId?: string }>;
  onReject: (sparkId: string) => Promise<boolean>;
  onShowPaywall: () => void;
}

export function SparkReceivedList({ sparks, onAccept, onReject, onShowPaywall }: SparkReceivedListProps) {
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (sparks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-12 h-12 text-amber-500/60" />
        </div>
        <h3 className="font-semibold text-lg text-foreground mb-2 text-center">
          Henüz ilgi yok
        </h3>
        <p className="text-muted-foreground text-center text-sm max-w-[260px] leading-relaxed">
          Bir kafede check-in yaptığında oradaki kişiler sana ilgi gönderebilir.
        </p>
      </div>
    );
  }

  const handleAccept = async (sparkId: string) => {
    if (!isPremium) {
      onShowPaywall();
      return;
    }
    setProcessingId(sparkId);
    const result = await onAccept(sparkId);
    setProcessingId(null);
    if (result.success && result.conversationId) {
      navigate(`/chat/${result.conversationId}`);
    }
  };

  // FOMO message
  const fomoMessage = sparks.length >= 3
    ? `Sana ${sparks.length} kişi ilgi gönderdi 🔥`
    : sparks.length >= 2
    ? `Sana ${sparks.length} kişi ilgi gönderdi 👀`
    : `Sana 1 kişi ilgi gönderdi`;

  return (
    <div className="space-y-4">
      {/* FOMO Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{fomoMessage}</p>
            {!isPremium && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Kimin gönderdiğini görmek için Premium'a geç
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Spark Cards */}
      {sparks.map((spark, index) => {
        const timeLeft = Math.max(0, Math.floor((spark.expiresAt.getTime() - Date.now()) / 60000));

        return (
          <div
            key={spark.id}
            className="card-elevated p-4 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Avatar - blurred for free users */}
              <div className="relative flex-shrink-0">
                {isPremium ? (
                  spark.fromUser?.photoUrl ? (
                    <img
                      src={spark.fromUser.photoUrl}
                      alt={spark.fromUser.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar
                      name={spark.fromUser?.displayName || 'Birisi'}
                      size="md"
                      className="rounded-full w-14 h-14"
                    />
                  )
                ) : (
                  <div className="relative w-14 h-14">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/30 to-purple-500/30 flex items-center justify-center overflow-hidden">
                      {/* Blurred silhouette */}
                      {spark.fromUser?.photoUrl ? (
                        <img
                          src={spark.fromUser.photoUrl}
                          alt=""
                          className="w-full h-full object-cover blur-xl scale-150"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-300/40 to-purple-400/40 blur-md" />
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-amber-500/80" />
                    </div>
                  </div>
                )}
                {/* Glow effect */}
                <div className="absolute -inset-1 rounded-full bg-amber-500/20 blur-md -z-10 animate-pulse-soft" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">
                  {isPremium ? (spark.fromUser?.displayName || 'Birisi') : '???'}
                  {' '}sana ilgi gönderdi ☕
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(spark.createdAt, { addSuffix: true, locale: tr })}
                  </span>
                  {timeLeft > 0 && (
                    <span className={cn(
                      'text-xs flex items-center gap-1',
                      timeLeft <= 5 ? 'text-destructive font-medium' : 'text-muted-foreground',
                    )}>
                      <Clock className={cn('w-3 h-3', timeLeft <= 5 && 'animate-pulse')} />
                      {timeLeft}dk kaldı
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                {isPremium ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(spark.id)}
                      disabled={processingId === spark.id}
                      className="text-xs"
                    >
                      Reddet
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(spark.id)}
                      disabled={processingId === spark.id}
                      className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0"
                    >
                      {processingId === spark.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Kabul Et'
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={onShowPaywall}
                    className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Gör
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Premium CTA for free users */}
      {!isPremium && (
        <button
          onClick={onShowPaywall}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/5 to-purple-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-foreground">
            Kimin gönderdiğini gör
          </span>
        </button>
      )}
    </div>
  );
}
