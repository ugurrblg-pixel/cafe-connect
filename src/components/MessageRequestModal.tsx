import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  presetMessages: string[];
  onSend: (message: string) => Promise<boolean>;
}

export function MessageRequestModal({
  open,
  onOpenChange,
  userName,
  presetMessages,
  onSend,
}: MessageRequestModalProps) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedMessage) return;

    setSending(true);
    const success = await onSend(selectedMessage);
    setSending(false);

    if (success) {
      setSelectedMessage(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {userName}</DialogTitle>
          <DialogDescription>
            Choose an opening message. {userName} will need to accept your request before you can chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {presetMessages.map((message, index) => (
            <button
              key={index}
              onClick={() => setSelectedMessage(message)}
              className={cn(
                'w-full p-3 rounded-xl text-left transition-all border-2',
                selectedMessage === message
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:bg-secondary'
              )}
            >
              <p className="text-sm text-foreground">{message}</p>
            </button>
          ))}
        </div>

        <Button
          onClick={handleSend}
          disabled={!selectedMessage || sending}
          className="w-full"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Request
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
