import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveCheckIn } from '@/hooks/useActiveCheckIn';
import { MapPin, Clock, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CheckInStatusBar() {
  const navigate = useNavigate();
  const { activeCheckIn, checkOut } = useActiveCheckIn();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Update time remaining every minute
  useEffect(() => {
    if (!activeCheckIn) return;

    const updateTime = () => {
      const now = new Date();
      const expiry = activeCheckIn.expiryTime;
      const diffMs = expiry.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins >= 60) {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setTimeRemaining(`${hours}h ${mins}m`);
      } else {
        setTimeRemaining(`${diffMins}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [activeCheckIn]);

  if (!activeCheckIn) return null;

  const handleCheckOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCheckingOut(true);
    const success = await checkOut();
    setIsCheckingOut(false);
    
    if (success) {
      toast.info('Checked out successfully');
    } else {
      toast.error('Failed to check out');
    }
  };

  const handleNavigateToCafe = () => {
    navigate(`/cafe/${activeCheckIn.cafeId}`);
  };

  return (
    <div
      onClick={handleNavigateToCafe}
      className={cn(
        'fixed top-0 left-0 right-0 z-40 safe-top',
        'bg-accent text-accent-foreground',
        'cursor-pointer transition-transform active:scale-[0.99]'
      )}
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Left: Cafe info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-accent-foreground/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {activeCheckIn.cafeName}
            </p>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <Clock className="w-3 h-3" />
              <span>{timeRemaining} remaining</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCheckOut}
            disabled={isCheckingOut}
            className="p-2 rounded-full bg-accent-foreground/20 hover:bg-accent-foreground/30 transition-colors"
            aria-label="Check out"
          >
            <X className="w-4 h-4" />
          </button>
          <ChevronRight className="w-5 h-5 opacity-60" />
        </div>
      </div>
    </div>
  );
}
