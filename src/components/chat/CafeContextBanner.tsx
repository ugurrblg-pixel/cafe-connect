import { MapPin } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface CafeContextBannerProps {
  cafeName?: string;
}

export function CafeContextBanner({ cafeName }: CafeContextBannerProps) {
  const { locale } = useI18n();
  
  const message = cafeName
    ? locale === 'tr' 
      ? `${cafeName} kafesinden eşleştiniz`
      : `Matched at ${cafeName}`
    : locale === 'tr'
      ? 'Aynı mekandan eşleştiniz'
      : "You matched at the same place";

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 px-4 mb-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <MapPin className="w-3 h-3" />
        <span>{message}</span>
      </div>
    </div>
  );
}
