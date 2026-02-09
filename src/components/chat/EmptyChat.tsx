import { MessageCircle, Sparkles, MapPin, Coffee } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface EmptyChatProps {
  otherUserName: string;
  cafeName?: string;
  onSuggestionTap?: (text: string) => void;
}

export function EmptyChat({ otherUserName, cafeName, onSuggestionTap }: EmptyChatProps) {
  const { t, locale } = useI18n();

  const suggestions = [
    t.chat.suggestion1,
    t.chat.suggestion2,
    t.chat.suggestion3,
  ];

  const cafeMessage = cafeName
    ? locale === 'tr' 
      ? `${cafeName} kafesinden eşleştiniz`
      : `You matched at ${cafeName}`
    : locale === 'tr'
      ? 'Aynı kafeden eşleştiniz'
      : "You matched at the same cafe";

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] px-6 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Cafe context badge - warmer design */}
      <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20">
        <Coffee className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-foreground/80">{cafeMessage}</span>
      </div>

      {/* Warm illustration */}
      <div className="relative mb-6">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-amber-500/10 rounded-full blur-xl scale-150" />
        
        <div className="relative w-20 h-20 bg-gradient-to-br from-secondary to-secondary/60 rounded-full flex items-center justify-center shadow-lg">
          <MessageCircle className="w-10 h-10 text-primary/50" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
      
      {/* Friendly heading */}
      <h3 className="font-bold text-xl text-foreground mb-2">
        {t.chat.youreFirstHere}
      </h3>
      
      {/* Encouraging subtext */}
      <p className="text-muted-foreground text-base max-w-[280px] leading-relaxed mb-8">
        {t.chat.firstMessageEncouragement}
      </p>

      {/* Suggestion chips - more prominent */}
      {onSuggestionTap && (
        <div className="flex flex-wrap justify-center gap-2.5 max-w-[320px]">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionTap(suggestion)}
              className="px-4 py-2.5 text-sm font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md border border-border/50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
