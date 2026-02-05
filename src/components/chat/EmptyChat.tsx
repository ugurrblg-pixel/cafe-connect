import { MessageSquare } from 'lucide-react';

interface EmptyChatProps {
  otherUserName: string;
}

export function EmptyChat({ otherUserName }: EmptyChatProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-2">
        Sohbet Başlat
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        {otherUserName} ile eşleştiniz! Sohbeti başlatmak için ilk mesajı gönderin.
      </p>
    </div>
  );
}
