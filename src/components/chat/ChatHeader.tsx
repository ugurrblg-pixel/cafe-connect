import { cn } from '@/lib/utils';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { isActiveNow, formatLastActive } from '@/lib/activityTime';
import { ChevronLeft, Crown } from 'lucide-react';

interface ChatHeaderProps {
  userName: string;
  userPhotoUrl?: string;
  lastActiveAt?: Date;
  isTyping?: boolean;
  typingText: string;
  onBack: () => void;
  actions?: React.ReactNode;
  isPremium?: boolean;
}

export function ChatHeader({
  userName,
  userPhotoUrl,
  lastActiveAt,
  isTyping,
  typingText,
  onBack,
  actions,
  isPremium = false,
}: ChatHeaderProps) {
  const isOnline = isActiveNow(lastActiveAt);
  const activityText = isOnline ? 'Online' : formatLastActive(lastActiveAt);

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b shadow-sm",
      isPremium ? "border-amber-500/30" : "border-border"
    )}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button 
            onClick={onBack} 
            className="p-2 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          
          {/* Avatar with online indicator and premium ring */}
          <div className="relative">
            <div className={cn(
              "rounded-full",
              isPremium && "ring-2 ring-amber-500/50"
            )}>
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
            </div>
            {/* Online/offline indicator */}
            <div className={cn(
              'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
              isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
            )} />
          </div>

          {/* User info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[15px] text-foreground leading-tight truncate">
                {userName}
              </span>
              {isPremium && (
                <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
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
