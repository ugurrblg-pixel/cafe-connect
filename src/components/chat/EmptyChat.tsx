import { MessageCircle } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface EmptyChatProps {
  otherUserName: string;
}

export function EmptyChat({ otherUserName }: EmptyChatProps) {
  const { t, formatString } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] px-8 text-center">
      {/* Icon with subtle background */}
      <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
        <MessageCircle className="w-10 h-10 text-muted-foreground/60" />
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
