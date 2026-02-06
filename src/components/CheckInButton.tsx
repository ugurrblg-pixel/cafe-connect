import { cn } from '@/lib/utils';
import { MapPin, Check, Loader2 } from 'lucide-react';

interface CheckInButtonProps {
  isCheckedIn: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  cafeName?: string;
  className?: string;
  verifyingLocation?: boolean;
}

export function CheckInButton({
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  cafeName,
  className,
  verifyingLocation = false,
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
        <span>Buradasın{cafeName ? ` - ${cafeName}` : ''}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onCheckIn}
      disabled={verifyingLocation}
      className={cn(
        'btn-checkin w-full flex items-center justify-center gap-2',
        verifyingLocation && 'opacity-70 cursor-not-allowed',
        className
      )}
    >
      {verifyingLocation ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Konum doğrulanıyor...</span>
        </>
      ) : (
        <>
          <MapPin className="w-5 h-5" />
          <span>Buradayım</span>
        </>
      )}
    </button>
  );
}
