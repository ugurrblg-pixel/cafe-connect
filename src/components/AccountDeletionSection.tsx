import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { invalidateVisibleProfiles } from '@/lib/visibilityEvents';
import { toast } from 'sonner';

export function AccountDeletionSection(){
 const {user}=useAuth();const navigate=useNavigate();
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[reauth,setReauth]=useState(false),[incomplete,setIncomplete]=useState(false);
 const active=useRef(user?.id);active.current=user?.id;
 const opener=useRef<HTMLButtonElement>(null);
 const enabled=import.meta.env.VITE_ACCOUNT_DELETION_ENABLED==='true';
 useEffect(()=>{let disposed=false;if(enabled&&user)void supabase.rpc('get_own_account_deletion').then(({data})=>{if(!disposed)setIncomplete(data===true);});return()=>{disposed=true;};},[enabled,user?.id]);
 const confirm=async()=>{
  if(!user)return false;const owner=user.id;setError('');setReauth(false);
  try{
   const {data,error:failure}=await supabase.functions.invoke('delete-account',{body:{confirmation:'SİL',deleteOwnMessages:true}});
   if(active.current!==owner)return false;
   if(failure||data?.deleted!==true){
    let code=data?.code;
    if(failure?.context instanceof Response){try{code=(await failure.context.json()).code;}catch{/* Unavailable or malformed gateway response. */}}
    if(code==='reauth_required'||code==='sign_in_required'){setReauth(true);setError('Güvenliğin için yeniden giriş yap. Ardından profiline dönüp silme işlemini tekrar başlat.');}
    else if(code==='incomplete'){setIncomplete(true);invalidateVisibleProfiles();setError('Silme henüz tamamlanmadı. Profilin kapalı; kaldığı yerden devam etmek için yeniden dene. Silinen fotoğraflar geri getirilemez.');}
    else setError('Silme sonucu doğrulanamadı. Bağlantını kontrol edip yeniden dene.');
    return false;
   }
   invalidateVisibleProfiles();
   for(const key of [`riyo_seen_events_${owner}`,`notif_prefs_${owner}`]){try{localStorage.removeItem(key);}catch{/* Server deletion is already complete. */}}
   await supabase.auth.signOut({scope:'local'});
   toast.success('Hesabın ve gönderdiğin mesajlar silindi.');navigate('/auth',{replace:true});return true;
  }catch{if(active.current===owner)setError('Silme sonucu doğrulanamadı. Bağlantını kontrol edip yeniden dene.');return false;}
 };
 const reauthenticate=async()=>{try{const {error:failure}=await supabase.auth.signOut({scope:'local'});if(failure)throw failure;navigate('/auth',{replace:true});}catch{setError('Çıkış yapılamadı. Bağlantını kontrol edip yeniden dene.');}};
 return <section className="px-4 py-4 border-t border-border/40" aria-label="Hesap silme">
  <h3 className="text-sm font-medium">Hesap silme</h3>
  <p className="text-xs text-muted-foreground mt-1 mb-3">{enabled?(incomplete?'Hesap silme tamamlanmayı bekliyor. Profilin kapalı; işlemi yeniden deneyerek tamamlayabilirsin.':'Profilini, fotoğraflarını ve gönderdiğin mesajları kalıcı olarak kaldır. İşlem öncesinde yeniden onay vereceksin.'):'Kalıcı hesap silme henüz kullanılamıyor.'}</p>
  {enabled&&<Button ref={opener} variant="outline" className="text-destructive" onClick={()=>{setError('');setReauth(false);setOpen(true);}}>{incomplete?'Silme işlemini tamamla':'Hesabımı sil'}</Button>}
  {enabled&&<DeleteAccountDialog open={open} onOpenChange={setOpen} onConfirm={confirm} error={error} reauthRequired={reauth} onReauthenticate={reauthenticate} onClosed={()=>opener.current?.focus()}/>}
 </section>;
}
