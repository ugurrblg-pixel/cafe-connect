import { MessageCircle, Sparkles } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface EmptyChatProps {
  otherUserName: string;
  onSuggestionTap?: (text: string) => void;
}

export function EmptyChat({ otherUserName, onSuggestionTap }: EmptyChatProps) {
  const { t } = useI18n();

  const suggestions = [
    t.chat.suggestion1,
    t.chat.suggestion2,
    t.chat.suggestion3,
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] px-6 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Soft icon */}
      <div className="relative mb-5">
        <div className="w-16 h-16 bg-secondary/60 rounded-full flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary/15 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-primary/70" />
        </div>
      </div>
      
      {/* Heading */}
      <h3 className="font-medium text-base text-foreground mb-1.5">
        {t.chat.letsChat}
      </h3>
      
      {/* Subtext */}
      <p className="text-muted-foreground text-sm max-w-[260px] leading-relaxed mb-6">
        {t.chat.firstMessageEncouragement}
      </p>

      {/* Suggestion chips */}
      {onSuggestionTap && (
        <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionTap(suggestion)}
              className="px-3.5 py-2 text-sm bg-secondary/70 hover:bg-secondary text-foreground/80 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
