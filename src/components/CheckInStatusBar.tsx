import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveCheckIn } from '@/hooks/useActiveCheckIn';
import { MapPin, Clock, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CheckInStatusBar() {
  const navigate = useNavigate();
  const { activeCheckIn, checkOut } = useActiveCheckIn();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progressPercent, setProgressPercent] = useState(100);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Animate in when check-in appears
  useEffect(() => {
    if (activeCheckIn) {
      // Small delay for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activeCheckIn]);

  // Calculate total duration for progress bar
  const totalDurationMs = useMemo(() => {
    if (!activeCheckIn) return 0;
    return activeCheckIn.expiryTime.getTime() - activeCheckIn.checkInTime.getTime();
  }, [activeCheckIn]);

  // Update time remaining every second for smooth countdown
  useEffect(() => {
    if (!activeCheckIn) return;

    const updateTime = () => {
      const now = new Date();
      const expiry = activeCheckIn.expiryTime;
      const diffMs = expiry.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        setProgressPercent(0);
        return;
      }

      // Calculate progress (time elapsed as percentage)
      const elapsed = now.getTime() - activeCheckIn.checkInTime.getTime();
      const percent = Math.max(0, Math.min(100, 100 - (elapsed / totalDurationMs) * 100));
      setProgressPercent(percent);

      // Format time remaining
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeCheckIn, totalDurationMs]);

  if (!activeCheckIn) return null;

  const handleCheckOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCheckingOut(true);
    setIsExiting(true);
    
    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const success = await checkOut();
    setIsCheckingOut(false);
    
    if (success) {
      toast.info('Checked out successfully');
    } else {
      setIsExiting(false);
      toast.error('Failed to check out');
    }
  };

  const handleNavigateToCafe = () => {
    navigate(`/cafe/${activeCheckIn.cafeId}`);
  };

  // Determine urgency color based on time remaining
  const isUrgent = progressPercent < 20;
  const isWarning = progressPercent < 40 && !isUrgent;

  return (
    <div
      onClick={handleNavigateToCafe}
      className={cn(
        'fixed top-0 left-0 right-0 z-40 safe-top',
        'cursor-pointer overflow-hidden',
        'transition-all duration-300 ease-out',
        isVisible && !isExiting 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0'
      )}
    >
      {/* Background with gradient */}
      <div className={cn(
        'relative transition-colors duration-500',
        isUrgent ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-accent'
      )}>
        {/* Progress bar underlay */}
        <div 
          className={cn(
            'absolute bottom-0 left-0 h-1 transition-all duration-1000 ease-linear',
            isUrgent ? 'bg-destructive-foreground/30' : 'bg-accent-foreground/20'
          )}
          style={{ width: `${progressPercent}%` }}
        />
        
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: Cafe info with animated icon */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
              'transition-all duration-300',
              isUrgent 
                ? 'bg-destructive-foreground/20 animate-pulse' 
                : 'bg-accent-foreground/20'
            )}>
              <MapPin className={cn(
                'w-4 h-4 transition-transform duration-300',
                isVisible ? 'scale-100' : 'scale-0'
              )} />
            </div>
            <div className="min-w-0">
              <p className={cn(
                'text-sm font-semibold truncate transition-colors',
                isUrgent ? 'text-destructive-foreground' : 'text-accent-foreground'
              )}>
                {activeCheckIn.cafeName}
              </p>
              <div className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isUrgent ? 'text-destructive-foreground/80' : 'text-accent-foreground/80'
              )}>
                <Clock className={cn(
                  'w-3 h-3',
                  isUrgent && 'animate-pulse'
                )} />
                <span className="font-medium tabular-nums">
                  {timeRemaining}
                </span>
                <span className="opacity-70">remaining</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckOut}
              disabled={isCheckingOut}
              className={cn(
                'p-2 rounded-full transition-all duration-200',
                'hover:scale-110 active:scale-95',
                isUrgent 
                  ? 'bg-destructive-foreground/20 hover:bg-destructive-foreground/30' 
                  : 'bg-accent-foreground/20 hover:bg-accent-foreground/30',
                isCheckingOut && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Check out"
            >
              <X className={cn(
                'w-4 h-4 transition-transform duration-200',
                isCheckingOut && 'animate-spin'
              )} />
            </button>
            <ChevronRight className={cn(
              'w-5 h-5 transition-transform duration-200',
              'group-hover:translate-x-0.5',
              isUrgent ? 'text-destructive-foreground/60' : 'text-accent-foreground/60'
            )} />
          </div>
        </div>
      </div>
    </div>
  );
}
