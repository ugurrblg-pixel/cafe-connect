import type { CSSProperties } from 'react';
import { ChevronRight, Flame, MapPin, Users } from 'lucide-react';
import { CafeImage } from './CafeImage';
import { venueSourceName, type VenueSource } from './VenueSources';
import { venueHeat } from './VenueActivity';
import { formatActiveUserCount } from '@/lib/photoAccess';
import type { Cafe } from '@/types';

export function VenueListCard({cafe,onClick,style}:{cafe:Cafe & VenueSource;onClick:()=>void;style?:CSSProperties}) {
 const heat=venueHeat(cafe.activeUsers);
 return <button type="button" onClick={onClick} style={style}
   className={`group flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-4 sm:p-4 ${heat ? 'border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06]' : 'border-border/70 bg-card hover:border-primary/30 hover:bg-secondary/40'}`}>
   <CafeImage cafeId={cafe.id} imageUrl={cafe.imageUrl} alt={cafe.name} category={cafe.category}
     aspectRatio="square" className="w-24 shrink-0 rounded-2xl sm:w-32" />
   <div className="min-w-0 flex-1 py-1">
     <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground sm:text-lg">{cafe.name}</h3>
     {cafe.distance && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{cafe.distance}</p>}
     <p className={`mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs sm:text-sm ${heat ? 'text-primary' : 'text-muted-foreground'}`}>
       {heat==='hot' ? <Flame className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Users className="h-4 w-4 shrink-0" aria-hidden="true" />}
       <span>{formatActiveUserCount(cafe.activeUsers)} kişi burada</span>
       {heat && <span className="font-semibold">· Hareketli</span>}
     </p>
     <p className="mt-1.5 text-[11px] text-muted-foreground">Kaynak: {venueSourceName(cafe.dataSource)}</p>
   </div>
   <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${heat ? 'bg-primary/10 text-primary' : 'bg-secondary/70 text-muted-foreground group-hover:text-primary'}`} aria-hidden="true"><ChevronRight className="h-5 w-5" /></span>
 </button>;
}
