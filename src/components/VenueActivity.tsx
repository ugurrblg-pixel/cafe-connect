import { Flame } from 'lucide-react';

export function venueHeat(count: number): 'warm' | 'hot' | null {
  if (count >= 10) return 'hot';
  if (count >= 5) return 'warm';
  return null;
}

export function VenueActivity({ count }: { count: number }) {
  const heat = venueHeat(count);
  if (!heat) return null;
  return <span className={`venue-flame-badge ${heat === 'hot' ? 'venue-flame-hot' : ''}`}>
    <Flame className="venue-flame w-4 h-4 fill-orange-400 text-orange-600" aria-hidden="true" />
    {heat === 'hot' ? 'Ortam alev alev' : 'Ortam canlanıyor'}
  </span>;
}
