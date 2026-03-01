import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRandomMatch } from '@/hooks/useRandomMatch';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Shuffle, MessageCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RandomMatchCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    matchedUser,
    loading,
    error,
    alreadyUsedToday,
    conversationId,
    findRandomMatch,
    startConversation,
  } = useRandomMatch();
  const [revealed, setRevealed] = useState(false);

  if (!user) return null;

  const handleFind = async () => {
    setRevealed(false);
    await findRandomMatch();
    // Small delay for reveal animation
    setTimeout(() => setRevealed(true), 300);
  };

  const handleMessage = async () => {
    if (conversationId) {
      navigate(`/chat/${conversationId}`);
      return;
    }
    await startConversation();
  };

  // After startConversation sets conversationId, navigate
  if (conversationId && matchedUser) {
    return (
      <div
        className="bg-card rounded-[20px] p-5 mb-6"
        style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-4">
          <img
                src={matchedUser.photo_url || '/placeholder.svg'}
                alt={matchedUser.display_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 cursor-pointer"
                onClick={() => navigate(`/profile/${matchedUser.user_id}`)}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${matchedUser.user_id}`)}>
                <p className="font-bold text-foreground text-[15px]">{matchedUser.display_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{matchedUser.bio}</p>
              </div>
        </div>
        <Button
          onClick={() => navigate(`/chat/${conversationId}`)}
          className="w-full mt-4 h-11 rounded-xl font-semibold"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Mesaj Gönder
        </Button>
        {alreadyUsedToday && (
          <p className="text-xs text-muted-foreground text-center mt-2">Yarın tekrar deneyebilirsin ✨</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-card rounded-[20px] p-5 mb-6 overflow-hidden"
      style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-[15px]">Bugün Kime Rastlarsın?</h3>
          <p className="text-xs text-muted-foreground">Günde 1 kez · Yakındaki aktif birini keşfet</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 mb-4">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Matched User Reveal */}
      {matchedUser && revealed ? (
        <div className={cn(
          "transition-all duration-500",
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${matchedUser.user_id}`)}>
              <img
                src={matchedUser.photo_url || '/placeholder.svg'}
                alt={matchedUser.display_name}
                className="w-20 h-20 rounded-2xl object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${matchedUser.user_id}`)}>
              <p className="font-bold text-foreground text-lg">{matchedUser.display_name}</p>
              {matchedUser.age && (
                <p className="text-sm text-muted-foreground">{matchedUser.age} yaşında</p>
              )}
              {matchedUser.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{matchedUser.bio}</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleMessage}
            disabled={loading}
            className="w-full h-11 rounded-xl font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-2" />
            )}
            Mesaj At
          </Button>
        </div>
      ) : (
        /* CTA Button */
        <Button
          onClick={handleFind}
          disabled={loading}
          variant="outline"
          className="w-full h-12 rounded-xl font-semibold border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Aranıyor...
            </>
          ) : (
            <>
              <Shuffle className="w-4 h-4 mr-2" />
              Rastgele Biri
            </>
          )}
        </Button>
      )}
    </div>
  );
}
