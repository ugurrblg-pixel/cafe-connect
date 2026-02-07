/**
 * OpenStreetMap opening_hours parser
 * Parses OSM opening_hours format and determines current status
 * 
 * Supported formats:
 * - "Mo-Fr 08:00-18:00"
 * - "Mo-Fr 08:00-18:00; Sa 09:00-14:00"
 * - "Mo-Su 07:00-22:00"
 * - "24/7"
 * - "Mo-Fr 08:00-12:00,13:00-18:00" (with break)
 */

export type CafeStatus = 'open' | 'closing-soon' | 'closed' | 'unknown';

export interface OpeningHoursStatus {
  status: CafeStatus;
  label: string;
  closesAt?: string; // e.g., "6:00 PM"
  opensAt?: string;  // e.g., "8:00 AM"
}

const DAY_MAP: Record<string, number> = {
  'su': 0, 'mo': 1, 'tu': 2, 'we': 3, 'th': 4, 'fr': 5, 'sa': 6
};

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Closing soon threshold (30 minutes)
const CLOSING_SOON_MINUTES = 30;

/**
 * Parse a day range like "Mo-Fr" or single day like "Mo"
 */
function parseDayRange(dayStr: string): number[] {
  const normalized = dayStr.toLowerCase().trim();
  
  // Single day
  if (normalized.length === 2 && DAY_MAP[normalized] !== undefined) {
    return [DAY_MAP[normalized]];
  }
  
  // Day range like "Mo-Fr"
  const rangeMatch = normalized.match(/^([a-z]{2})-([a-z]{2})$/);
  if (rangeMatch) {
    const start = DAY_MAP[rangeMatch[1]];
    const end = DAY_MAP[rangeMatch[2]];
    
    if (start !== undefined && end !== undefined) {
      const days: number[] = [];
      let current = start;
      while (current !== end) {
        days.push(current);
        current = (current + 1) % 7;
      }
      days.push(end);
      return days;
    }
  }
  
  return [];
}

/**
 * Parse time string like "08:00" to minutes from midnight
 */
function parseTime(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/**
 * Format minutes from midnight to human-readable time
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return mins === 0 ? `${displayHours} ${period}` : `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

interface TimeRange {
  days: number[];
  openMinutes: number;
  closeMinutes: number;
}

/**
 * Parse opening hours string into structured time ranges
 */
function parseOpeningHours(hoursStr: string): TimeRange[] {
  const ranges: TimeRange[] = [];
  
  // Handle 24/7
  if (hoursStr.toLowerCase().includes('24/7')) {
    return [{ days: [0, 1, 2, 3, 4, 5, 6], openMinutes: 0, closeMinutes: 1440 }];
  }
  
  // Split by semicolon for different day groups
  const groups = hoursStr.split(';').map(s => s.trim()).filter(Boolean);
  
  for (const group of groups) {
    // Match pattern like "Mo-Fr 08:00-18:00" or "Mo 08:00-18:00,13:00-17:00"
    const match = group.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (!match) continue;
    
    const dayPart = match[1];
    const timePart = match[2];
    
    // Parse days (can be comma-separated like "Mo,We,Fr" or range like "Mo-Fr")
    const daySegments = dayPart.split(',').map(s => s.trim());
    const allDays: number[] = [];
    for (const segment of daySegments) {
      allDays.push(...parseDayRange(segment));
    }
    
    if (allDays.length === 0) continue;
    
    // Parse time ranges (can be comma-separated like "08:00-12:00,13:00-18:00")
    const timeSegments = timePart.split(',').map(s => s.trim());
    for (const timeSegment of timeSegments) {
      const timeMatch = timeSegment.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
      if (!timeMatch) continue;
      
      const openMinutes = parseTime(timeMatch[1]);
      let closeMinutes = parseTime(timeMatch[2]);
      
      // Handle overnight hours (e.g., 22:00-02:00)
      if (closeMinutes <= openMinutes) {
        closeMinutes += 1440; // Add 24 hours
      }
      
      if (openMinutes >= 0 && closeMinutes > 0) {
        ranges.push({ days: allDays, openMinutes, closeMinutes });
      }
    }
  }
  
  return ranges;
}

/**
 * Get the current cafe status based on opening hours string
 */
export function getCafeStatus(openingHours: string | null | undefined): OpeningHoursStatus {
  if (!openingHours || openingHours.trim() === '') {
    return { status: 'unknown', label: 'Hours unknown' };
  }
  
  try {
    const ranges = parseOpeningHours(openingHours);
    
    if (ranges.length === 0) {
      return { status: 'unknown', label: 'Hours unknown' };
    }
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Check if currently open
    for (const range of ranges) {
      if (range.days.includes(currentDay)) {
        // Handle overnight hours
        const effectiveClose = range.closeMinutes > 1440 ? range.closeMinutes - 1440 : range.closeMinutes;
        const isOvernight = range.closeMinutes > 1440;
        
        // Check if within opening hours
        if (isOvernight) {
          // Overnight: open from openMinutes until midnight, then midnight until closeMinutes
          if (currentMinutes >= range.openMinutes || currentMinutes < effectiveClose) {
            const minutesUntilClose = currentMinutes >= range.openMinutes
              ? (1440 - currentMinutes) + effectiveClose
              : effectiveClose - currentMinutes;
            
            if (minutesUntilClose <= CLOSING_SOON_MINUTES) {
              return {
                status: 'closing-soon',
                label: `Closes at ${formatTime(effectiveClose)}`,
                closesAt: formatTime(effectiveClose),
              };
            }
            
            return {
              status: 'open',
              label: `Open until ${formatTime(effectiveClose)}`,
              closesAt: formatTime(effectiveClose),
            };
          }
        } else {
          // Normal hours
          if (currentMinutes >= range.openMinutes && currentMinutes < range.closeMinutes) {
            const minutesUntilClose = range.closeMinutes - currentMinutes;
            
            if (minutesUntilClose <= CLOSING_SOON_MINUTES) {
              return {
                status: 'closing-soon',
                label: `Closes at ${formatTime(range.closeMinutes)}`,
                closesAt: formatTime(range.closeMinutes),
              };
            }
            
            return {
              status: 'open',
              label: `Open until ${formatTime(range.closeMinutes)}`,
              closesAt: formatTime(range.closeMinutes),
            };
          }
        }
      }
    }
    
    // Not currently open - find next opening time
    const nextOpening = findNextOpening(ranges, currentDay, currentMinutes);
    if (nextOpening) {
      return {
        status: 'closed',
        label: nextOpening.isToday 
          ? `Opens at ${formatTime(nextOpening.minutes)}`
          : `Opens ${DAY_NAMES[nextOpening.day]} ${formatTime(nextOpening.minutes)}`,
        opensAt: formatTime(nextOpening.minutes),
      };
    }
    
    return { status: 'closed', label: 'Closed' };
  } catch (error) {
    console.warn('Error parsing opening hours:', error);
    return { status: 'unknown', label: 'Hours unknown' };
  }
}

function findNextOpening(
  ranges: TimeRange[], 
  currentDay: number, 
  currentMinutes: number
): { day: number; minutes: number; isToday: boolean } | null {
  // Check for later opening today
  for (const range of ranges) {
    if (range.days.includes(currentDay) && range.openMinutes > currentMinutes) {
      return { day: currentDay, minutes: range.openMinutes, isToday: true };
    }
  }
  
  // Check subsequent days
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    for (const range of ranges) {
      if (range.days.includes(checkDay)) {
        return { day: checkDay, minutes: range.openMinutes, isToday: false };
      }
    }
  }
  
  return null;
}

/**
 * Get status color classes for the cafe status
 */
export function getStatusColors(status: CafeStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'open':
      return { bg: 'bg-accent/20', text: 'text-accent' };
    case 'closing-soon':
      return { bg: 'bg-warning/20', text: 'text-warning' };
    case 'closed':
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
    default:
      return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
}
