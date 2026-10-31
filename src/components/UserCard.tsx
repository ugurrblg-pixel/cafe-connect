import { PrivateProfileImage } from '@/components/PrivateProfileImage';
import { memo, useState } from 'react';
import { User } from '@/types';
import { PurposeBadge } from './PurposeBadge';
import { VerifiedBadge } from './VerifiedBadge';
import { InitialsAvatar } from './InitialsAvatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageCircle, Hand, Check, Loader2, Heart, Clock, ChevronRight } from 'lucide-react';

type WaveState = 'none' | 'waved' | 'received' | 'matched';
interface UserCardProps {
 user: User; onMessage?: () => void; onInteraction?: (type: 'wave' | 'coffee' | 'eye') => void;
 onTap?: () => void; waveState?: WaveState; isWaving?: boolean; sparkButton?: React.ReactNode;
 className?: string; style?: React.CSSProperties;
}
export const UserCard = memo(function UserCard({user,onMessage,onInteraction,onTap,waveState='none',isWaving=false,sparkButton,className,style}:UserCardProps){
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 const displayName=user.displayName||user.name;
 const checkedAt=user.checkedInAt?.getTime();
 const minutes=checkedAt&&Number.isFinite(checkedAt)?Math.max(0,Math.floor((Date.now()-checkedAt)/60000)):null;
 const activeAt=user.lastActiveAt?.getTime();
 const activeMinutes=activeAt&&Number.isFinite(activeAt)?Math.max(0,Math.floor((Date.now()-activeAt)/60000)):null;
 const active=activeMinutes!==null&&activeMinutes<2;
 const activityText=active?'Şimdi aktif':activeMinutes!==null?(activeMinutes<60?activeMinutes+' dk önce aktif':Math.floor(activeMinutes/60)+' sa önce aktif'):'Aktiflik bilgisi yok';
 const sent=waveState==='waved';const matched=waveState==='matched';const received=waveState==='received';
 const label=matched?'Eşleştiniz':sent?'Selam gönderildi':received?'Selamı yanıtla':'Selam ver';
 return <article className={cn('rounded-3xl border border-border/80 bg-card p-4 shadow-sm',className)} style={style}>
  <div className="flex items-start gap-3.5">
   <button type="button" onClick={onTap} disabled={!onTap} aria-label={displayName+' profilini görüntüle'} className="relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default">
    {user.photoUrl&&failedSrc!==user.photoUrl?<PrivateProfileImage src={user.photoUrl} alt={displayName} loading="lazy" className="h-20 w-20 rounded-2xl object-cover" onError={()=>setFailedSrc(user.photoUrl)}/>:<InitialsAvatar name={displayName} size="md" className="h-20 w-20 border border-primary/10 bg-brand-soft [&>span]:text-primary"/>}
    {active&&<span aria-label="Şimdi aktif" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-card bg-accent"/>}
   </button>
   <div className="min-w-0 flex-1">
    <div className="flex items-start gap-1.5"><h3 className="min-w-0 flex-1 text-base font-bold leading-snug"><button type="button" disabled={!onTap} onClick={onTap} className="break-words rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">{displayName}{user.age?',\u00a0'+user.age:''}</button></h3>{user.isVerified&&<VerifiedBadge size="sm"/>}</div>
    <div className="mt-2"><PurposeBadge purpose={user.purpose} size="sm"/></div>
    <p className={cn('mt-2 text-xs font-medium',active?'text-accent':'text-muted-foreground')}>{activityText}</p>
   </div>
  </div>
  {user.bio&&<p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground line-clamp-3">{user.bio}</p>}
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
   {minutes!==null?<span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="h-3.5 w-3.5"/>{minutes===0?'Az önce katıldı':minutes+' dk burada'}</span>:<span>Bu mekanda</span>}
   {onTap&&<button type="button" onClick={onTap} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-primary hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Profili gör<ChevronRight aria-hidden="true" className="h-3.5 w-3.5"/></button>}
  </div>
  <div className="mt-2 flex flex-wrap items-center gap-2">
   <Button type="button" variant={received?'default':'outline'} disabled={!onInteraction||isWaving||sent||matched} aria-label={label} aria-busy={isWaving} onClick={()=>onInteraction?.('wave')} className={cn('h-11 min-w-0 flex-1 gap-2 rounded-2xl text-xs font-semibold',matched&&'border-accent/20 bg-accent/10 text-accent',sent&&'bg-secondary text-muted-foreground')}>
    {isWaving?<Loader2 className="h-4 w-4 animate-spin"/>:matched?<Heart className="h-4 w-4"/>:sent?<Check className="h-4 w-4"/>:<Hand className="h-4 w-4"/>}{isWaving?'Gönderiliyor…':label}
   </Button>
   {matched&&onMessage&&<Button type="button" onClick={onMessage} className="h-11 gap-2 rounded-2xl text-xs"><MessageCircle className="h-4 w-4"/>Sohbet</Button>}
   {sparkButton}
  </div>
 </article>;
});
