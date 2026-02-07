import { cn } from '@/lib/utils';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { isActiveNow, formatLastActive } from '@/lib/activityTime';
import { ChevronLeft } from 'lucide-react';

interface ChatHeaderProps {
  userName: string;
  userPhotoUrl?: string;
  lastActiveAt?: Date;
  isTyping?: boolean;
  typingText: string;
  onBack: () => void;
  actions?: React.ReactNode;
}

export function ChatHeader({
  userName,
  userPhotoUrl,
  lastActiveAt,
  isTyping,
  typingText,
  onBack,
  actions,
}: ChatHeaderProps) {
  const isOnline = isActiveNow(lastActiveAt);
  const activityText = isOnline ? 'Online' : formatLastActive(lastActiveAt);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button 
            onClick={onBack} 
            className="p-2 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          
          {/* Avatar with online indicator */}
          <div className="relative">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <InitialsAvatar 
                name={userName} 
                size="sm" 
                className="w-10 h-10"
              />
            )}
            {/* Online/offline indicator */}
            <div className={cn(
              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
              isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )} />
          </div>

          {/* User info */}
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-[15px] text-foreground leading-tight truncate">
              {userName}
            </span>
            <span className={cn(
              'text-xs leading-tight',
              isTyping ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {isTyping ? typingText : activityText}
            </span>
          </div>
        </div>

        {/* Actions (menu) */}
        {actions}
      </div>
    </div>
  );
}
