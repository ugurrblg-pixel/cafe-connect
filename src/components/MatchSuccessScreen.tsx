import { useI18n } from '@/contexts/I18nContext';
import { InitialsAvatar } from '@/components/InitialsAvatar';

interface MatchSuccessScreenProps {
  open: boolean;
  user1PhotoUrl?: string | null;
  user1Name: string;
  user2PhotoUrl?: string | null;
  user2Name: string;
  onStartChat: () => void;
  onKeepExploring: () => void;
}

export function MatchSuccessScreen({
  open,
  user1PhotoUrl,
  user1Name,
  user2PhotoUrl,
  user2Name,
  onStartChat,
  onKeepExploring,
}: MatchSuccessScreenProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center px-8 max-w-sm w-full">
        {/* Profile images overlapping */}
        <div className="flex items-center justify-center mb-10 relative">
          {/* Glow effect behind */}
          <div
            className="absolute w-40 h-40 rounded-full opacity-20"
            style={{
              background: 'hsl(var(--primary))',
              filter: 'blur(40px)',
            }}
          />

          {/* User 1 */}
          <div className="relative z-10 w-24 h-24 rounded-full border-[3px] border-card overflow-hidden"
            style={{ boxShadow: '0 4px 20px hsl(var(--primary) / 0.15)' }}
          >
            {user1PhotoUrl ? (
              <img src={user1PhotoUrl} alt={user1Name} className="w-full h-full object-cover" />
            ) : (
              <InitialsAvatar name={user1Name} size="lg" />
            )}
          </div>

          {/* User 2 — overlaps left */}
          <div className="relative z-20 -ml-6 w-24 h-24 rounded-full border-[3px] border-card overflow-hidden"
            style={{ boxShadow: '0 4px 20px hsl(var(--primary) / 0.15)' }}
          >
            {user2PhotoUrl ? (
              <img src={user2PhotoUrl} alt={user2Name} className="w-full h-full object-cover" />
            ) : (
              <InitialsAvatar name={user2Name} size="lg" />
            )}
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
          It's a vibe. ✨
        </h1>

        {/* Subtext */}
        <p className="text-muted-foreground text-center mb-10">
          You both showed interest.
        </p>

        {/* Primary CTA */}
        <button
          onClick={onStartChat}
          className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base transition-all active:scale-[0.98] mb-3"
          style={{ boxShadow: '0 4px 16px hsl(var(--primary) / 0.3)' }}
        >
          Start Chat
        </button>

        {/* Secondary CTA */}
        <button
          onClick={onKeepExploring}
          className="w-full py-3 text-muted-foreground font-medium text-sm transition-colors hover:text-foreground"
        >
          Keep Exploring
        </button>
      </div>
    </div>
  );
}
