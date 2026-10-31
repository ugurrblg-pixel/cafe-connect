import { cn } from '@/lib/utils';
import { MapPin, Check, Loader2, ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface CheckInButtonProps {
 isCheckedIn:boolean; onCheckIn:()=>void; onCheckOut:()=>void; cafeName?:string;
 className?:string; verifyingLocation?:boolean; busy?:boolean;
}
export function CheckInButton({isCheckedIn,onCheckIn,onCheckOut,cafeName,className,verifyingLocation=false,busy=false}:CheckInButtonProps){
 const pending=busy||verifyingLocation;
 return <div className="space-y-3">
  {isCheckedIn&&<div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-accent"><Check aria-hidden="true" className="h-4 w-4 shrink-0"/><span className="truncate">Buradasın{cafeName?' · '+cafeName:''}</span></div>}
  <Button type="button" variant={isCheckedIn?'outline':'default'} onClick={isCheckedIn?onCheckOut:onCheckIn} disabled={pending} aria-busy={pending} className={cn('h-12 w-full gap-2 rounded-2xl text-sm font-bold shadow-sm',className)}>
   {pending?<Loader2 aria-hidden="true" className="h-5 w-5 animate-spin"/>:isCheckedIn?<LogOut aria-hidden="true" className="h-4 w-4"/>:<MapPin aria-hidden="true" className="h-5 w-5"/>}
   {verifyingLocation?'Konum doğrulanıyor…':busy?'İşlem sürüyor…':isCheckedIn?'Mekandan ayrıl':'Buradayım'}
  </Button>
  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0"/><span>{isCheckedIn?'Ayrıldığında bu mekandaki kişilere profilin gösterilmez.':import.meta.env.VITE_CAFE_PHOTOS_ENABLED==='true'?'Katılınca onaylı fotoğrafların ve sınırlı profilin aynı mekandaki katılımcılara görünür. Tam konumun paylaşılmaz.':'Tam konumun paylaşılmaz.'}</span></p>
 </div>;
}
