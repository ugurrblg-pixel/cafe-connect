import { useNavigate } from 'react-router-dom';
import { X, Crown, Sparkles, Lock, Eye, Check, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SparkPaywallTrigger = 'send_limit' | 'reveal_sender' | 'accept_spark';

interface SparkPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: SparkPaywallTrigger;
  sparkCount?: number;
}

const TRIGGER_CONFIG: Record<SparkPaywallTrigger, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
}> = {
  send_limit: {
    title: 'Bugünkü İlgi Hakkın Doldu ☕',
    subtitle: 'Daha fazla kişiye ilgi göndermek için Premium\'a geç.',
    icon: Sparkles,
  },
  reveal_sender: {
    title: 'Sana ilgi gönderen biri var!',
    subtitle: 'Kimin gönderdiğini görmek için Premium\'a geç.',
    icon: Eye,
  },
  accept_spark: {
    title: 'İlgiyi kabul et, sohbete başla!',
    subtitle: 'İlgileri kabul edip eşleşmek için Premium gerekli.',
    icon: Coffee,
  },
};

export function SparkPaywallModal({ isOpen, onClose, trigger = 'send_limit', sparkCount = 0 }: SparkPaywallModalProps) {
  const navigate = useNavigate();
  const config = TRIGGER_CONFIG[trigger];
  const TriggerIcon = config.icon;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-secondary/80 hover:bg-secondary transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 pt-10 pb-8 px-6 text-center text-white relative overflow-hidden">
          {/* Sparkle effects */}
          <div className="absolute top-4 left-8 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
          <div className="absolute top-12 right-12 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-6 left-16 w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <TriggerIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-white/80 mt-2">{config.subtitle}</p>

          {sparkCount > 0 && trigger === 'reveal_sender' && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              {sparkCount} kişi ilgi gönderdi
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="px-6 py-5">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-500" />
            PREMIUM AVANTAJLARI
          </h4>
          <ul className="space-y-2.5">
            {[
              'Günde 3 ilgi gönder',
              'Kimin gönderdiğini gör',
              'İlgileri kabul et & eşleş',
              'Profil boost & görünürlük',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 safe-bottom space-y-3">
          <Button
            onClick={() => { onClose(); navigate('/subscription'); }}
            className="w-full h-14 rounded-2xl text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
          >
            <Crown className="w-5 h-5 mr-2" />
            Premium'a Geç
          </Button>
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Daha sonra
          </button>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Güvenli ödeme</p>
          </div>
        </div>
      </div>
    </div>
  );
}
