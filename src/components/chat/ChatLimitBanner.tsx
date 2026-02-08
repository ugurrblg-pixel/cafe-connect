import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';

interface ChatLimitBannerProps {
  className?: string;
}

export function ChatLimitBanner({ className }: ChatLimitBannerProps) {
  const navigate = useNavigate();
  const { isPremium, canStartChat, remainingChats, FREE_CHAT_LIMIT, loading } = usePremium();

  // Don't show for premium users or when loading
  if (loading || isPremium || canStartChat) return null;

  return (
    <div className={cn(
      'mx-4 mb-3 p-4 rounded-2xl',
      'bg-gradient-to-r from-amber-500/10 to-orange-500/10',
      'border border-amber-500/20',
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            Günlük sohbet limitine ulaştın
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bugün {FREE_CHAT_LIMIT} yeni sohbet hakkını kullandın
          </p>
        </div>
      </div>
      
      <Button
        onClick={() => navigate('/subscription')}
        size="sm"
        className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
      >
        <Crown className="w-4 h-4 mr-2" />
        Premium'a Geç
      </Button>
    </div>
  );
}
