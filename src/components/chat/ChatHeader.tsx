import { useState } from 'react';
import { cn } from '@/lib/utils';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { isActiveNow, formatLastActive } from '@/lib/activityTime';
import { ChevronLeft, Crown } from 'lucide-react';
import { FullscreenGallery } from '@/components/FullscreenGallery';

interface ChatHeaderProps {
  userName: string;
  userPhotoUrl?: string;
  userPhotoUrls?: string[];
  lastActiveAt?: Date;
  isTyping?: boolean;
  typingText: string;
  onBack: () => void;
  onProfileClick?: () => void;
  actions?: React.ReactNode;
  isPremium?: boolean;
}

export function ChatHeader({
  userName,
  userPhotoUrl,
  userPhotoUrls,
  lastActiveAt,
  isTyping,
  typingText,
  onBack,
  onProfileClick,
  actions,
  isPremium = false,
}: ChatHeaderProps) {
  const isOnline = isActiveNow(lastActiveAt);
  const activityText = isOnline ? 'Çevrimiçi' : formatLastActive(lastActiveAt);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Build gallery photos array
  const galleryPhotos = (userPhotoUrls ?? []).filter(Boolean);
  if (galleryPhotos.length === 0 && userPhotoUrl) galleryPhotos.push(userPhotoUrl);

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-lg border-b shadow-sm",
      isPremium ? "border-amber-500/30" : "border-border/50"
    )}>
      <div className="flex items-center justify-between px-2 py-2.5">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button 
            onClick={onBack} 
            className="p-2.5 -ml-1 rounded-full hover:bg-secondary active:bg-secondary/80 transition-all active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          
          {/* Clickable avatar + name area */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 hover:bg-secondary/50 rounded-xl px-1.5 py-1 -my-1 transition-colors active:scale-[0.98]"
          >
            {/* Avatar with online indicator */}
            <div className="relative">
              <div className={cn(
                "rounded-full transition-all",
                isPremium && "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background"
              )}>
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={userName}
                    className="w-11 h-11 rounded-full object-cover shadow-sm cursor-pointer"
                    onClick={(e) => {
                      if (galleryPhotos.length > 0) {
                        e.stopPropagation();
                        setGalleryOpen(true);
                      }
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <InitialsAvatar 
                    name={userName} 
                    size="sm" 
                    className="w-11 h-11"
                  />
                )}
              </div>
              <div className={cn(
                'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background',
                isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/30'
              )}>
                {isOnline && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                )}
              </div>
            </div>

            {/* User info */}
            <div className="flex flex-col min-w-0 ml-1 text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[16px] text-foreground leading-tight truncate">
                  {userName}
                </span>
                {isPremium && (
                  <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <span className={cn(
                'text-xs leading-tight font-medium',
                isTyping ? 'text-primary' : isOnline ? 'text-emerald-600 dark:text-emerald-500' : 'text-muted-foreground'
              )}>
                {isTyping ? (
                  <span className="flex items-center gap-1">
                    {typingText}
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                ) : activityText}
              </span>
            </div>
          </button>
        </div>

        {/* Actions (menu) */}
        {actions}
      </div>
      {/* Fullscreen Gallery for chat partner photos */}
      <FullscreenGallery
        photos={galleryPhotos}
        initialIndex={0}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}