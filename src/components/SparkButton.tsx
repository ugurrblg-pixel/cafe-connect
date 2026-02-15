import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Check } from 'lucide-react';

interface SparkButtonProps {
  onSend: () => void;
  hasSent: boolean;
  isSending: boolean;
  disabled?: boolean;
  className?: string;
}

export const SparkButton = memo(function SparkButton({
  onSend,
  hasSent,
  isSending,
  disabled,
  className,
}: SparkButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSend();
      }}
      disabled={disabled || isSending || hasSent}
      className={cn(
        'interaction-btn min-w-[80px] px-3 py-2 flex items-center justify-center gap-1.5 transition-all',
        hasSent && 'bg-amber-500/20 text-amber-600',
        !hasSent && !disabled && 'hover:bg-amber-500/10 text-amber-500 hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]',
        disabled && !hasSent && 'opacity-50',
        className,
      )}
      aria-label={hasSent ? 'Spark sent' : 'Send Spark'}
    >
      {isSending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : hasSent ? (
        <>
          <Check className="w-4 h-4" />
          <span className="text-xs font-medium">Gönderildi</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium">İlgi</span>
        </>
      )}
    </button>
  );
});
