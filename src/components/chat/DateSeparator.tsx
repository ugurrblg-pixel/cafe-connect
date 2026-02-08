import { useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';

interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const { locale } = useI18n();
  
  const label = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return locale === 'tr' ? 'Bugün' : 'Today';
    }
    
    if (msgDate.getTime() === yesterday.getTime()) {
      return locale === 'tr' ? 'Dün' : 'Yesterday';
    }
    
    // For older dates, show formatted date
    return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, [date, locale]);

  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 py-1 rounded-full bg-secondary/80 text-xs font-medium text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/**
 * Check if two dates are on different calendar days
 */
export function isDifferentDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  );
}

/**
 * Check if there's a significant time gap between messages (5+ minutes)
 */
export function hasSignificantTimeGap(date1: Date, date2: Date): boolean {
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes >= 5;
}
