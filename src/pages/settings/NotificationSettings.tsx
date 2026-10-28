import {useState,useEffect} from 'react';
import {Header} from '@/components/Header';
import {PageLayout} from '@/components/PageLayout';
import {Switch} from '@/components/ui/switch';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';
import {MessageCircle,Heart} from 'lucide-react';
import {readNotificationPrefs,NOTIFICATION_PREFS_CHANGED,type InAppNotificationPrefs} from '@/lib/notificationPrefs';
export default function NotificationSettings(){
 const {user}=useAuth();const [prefs,setPrefs]=useState<InAppNotificationPrefs>({new_messages:true,new_matches:true});
 useEffect(()=>{if(user)setPrefs(readNotificationPrefs(user.id));},[user?.id]);
 const update=(key:keyof InAppNotificationPrefs,value:boolean)=>{
  if(!user)return;const next={...prefs,[key]:value};
  try{localStorage.setItem(`notif_prefs_${user.id}`,JSON.stringify(next));setPrefs(next);window.dispatchEvent(new Event(NOTIFICATION_PREFS_CHANGED));toast.success('Bu cihazdaki bildirim tercihin kaydedildi.');}
  catch{toast.error('Tercih kaydedilemedi. Tarayıcı depolama iznini kontrol et.');}
 };
 return <PageLayout><div className="min-h-screen bg-background pb-24"><Header title="Bildirim ayarları" showBack/><main className="px-5 pt-20">
  <h1 className="mb-2 text-xl font-semibold">Uygulama içi bildirimler</h1><p className="mb-6 text-sm leading-relaxed text-muted-foreground">Alt menüdeki rozetler yeni selamları, eşleşmeleri ve okunmamış mesajları gösterir. Mesajlar yalnızca sohbeti açtığında okundu sayılır.</p>
  <section className="card-elevated divide-y divide-border">
   {([{key:'new_messages',label:'Okunmamış mesajlar',description:'Mesajlar simgesinde okunmamış sayısını göster.',Icon:MessageCircle},{key:'new_matches',label:'Selamlar ve eşleşmeler',description:'Bildirimler simgesinde yeni hareketleri göster.',Icon:Heart}] as const).map(({key,label,description,Icon})=><div key={key} className="flex items-center justify-between gap-4 p-4"><div className="flex min-w-0 items-start gap-3"><Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary"/><div><label htmlFor={key} className="font-medium">{label}</label><p className="mt-1 text-sm text-muted-foreground" id={`${key}-help`}>{description}</p></div></div><Switch id={key} checked={prefs[key]} aria-describedby={`${key}-help`} onCheckedChange={value=>update(key,value)} disabled={!user}/></div>)}
  </section>
  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Bu tercihler yalnızca bu tarayıcıda saklanır. Uygulama kapalıyken gelen telefon bildirimleri henüz kullanılamıyor.</p>
 </main></div></PageLayout>;
}
