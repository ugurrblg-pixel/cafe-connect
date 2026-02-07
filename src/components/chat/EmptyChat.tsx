import { MessageCircle, Coffee } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface EmptyChatProps {
  otherUserName: string;
}

export function EmptyChat({ otherUserName }: EmptyChatProps) {
  const { t, formatString } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] px-8 text-center">
      {/* Icon with warm styling */}
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center shadow-sm border border-border/30">
          <MessageCircle className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Coffee className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      {/* Heading */}
      <h3 className="font-semibold text-lg text-foreground mb-2">
        {formatString(t.chat.startConversation, { name: otherUserName })}
      </h3>
      
      {/* Subtext */}
      <p className="text-muted-foreground text-sm max-w-[240px] leading-relaxed">
        {t.chat.startConversationDesc}
      </p>
    </div>
  );
}
