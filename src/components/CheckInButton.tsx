import { cn } from '@/lib/utils';
import { MapPin, Check } from 'lucide-react';

interface CheckInButtonProps {
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  cafeName?: string;
  className?: string;
}

export function CheckInButton({
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  cafeName,
  className,
}: CheckInButtonProps) {
  if (isCheckedIn) {
    return (
      <button
        onClick={onCheckOut}
        className={cn(
          'w-full py-4 px-6 rounded-full font-semibold transition-all flex items-center justify-center gap-2',
          'bg-sage-light text-accent border-2 border-accent',
          className
        )}
      >
        <Check className="w-5 h-5" />
        <span>You're here{cafeName ? ` at ${cafeName}` : ''}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onCheckIn}
      className={cn('btn-checkin w-full flex items-center justify-center gap-2', className)}
    >
      <MapPin className="w-5 h-5" />
      <span>I'm here</span>
    </button>
  );
}
