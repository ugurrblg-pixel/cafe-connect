import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { cn } from '@/lib/utils';

const BANNER_DISMISSED_KEY = 'riyo_profile_banner_dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function ProfileCompletionBanner() {
  const navigate = useNavigate();
  const { isComplete, percentage, missingFields } = useProfileCompletion();
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    // Check if banner was dismissed recently
    const dismissedAt = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  const handleComplete = () => {
    navigate('/profile/edit');
  };

  // Don't show if profile is complete or dismissed
  if (isComplete || isDismissed) {
    return null;
  }

  return (
    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-primary/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h3 className="font-semibold text-foreground text-sm mb-0.5">
              Profilini tamamla ✨
            </h3>
            <p className="text-xs text-muted-foreground">
              {missingFields.length === 1 
                ? `${missingFields[0]} ekle, daha fazla kişiyle tanış`
                : 'Profilini doldur, öne çık ve daha fazla bağlantı kur'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Tamamlanma oranı</span>
            <span className="text-xs font-medium text-primary">%{percentage}</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* CTA */}
        <Button
          onClick={handleComplete}
          size="sm"
          className="w-full h-10 rounded-xl font-medium"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Profilini Düzenle
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
