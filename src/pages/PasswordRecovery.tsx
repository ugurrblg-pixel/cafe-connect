import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PasswordRecovery() {
 const resetting=useLocation().pathname==='/reset-password';
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [saved,setSaved]=useState(false);
 const [sessionEmail,setSessionEmail]=useState<string|null>(null);
 const [checking,setChecking]=useState(resetting);
 useEffect(()=>{
  if(!resetting)return;
  let active=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(active){setSessionEmail(session?.user.email||null);setChecking(false);}
  });
  void supabase.auth.getSession().then(({data,error})=>{
   if(active){setSessionEmail(error?null:data.session?.user.email||null);setChecking(false);}
  }).catch(()=>{if(active)setChecking(false);});
  return()=>{active=false;subscription.unsubscribe();};
 },[resetting]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;
  if(resetting&&(!sessionEmail||password.length<8||password!==confirmation)){
   toast.error('Şifreler aynı olmalı ve en az 8 karakter içermeli.');return;
  }
  setBusy(true);
  try{
   if(resetting){
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setPassword('');setConfirmation('');setSaved(true);
   }else{
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password`});
    if(error)throw error;setSent(true);
   }
  }catch{toast.error(resetting?'Şifre kaydedilemedi. Bağlantının süresi dolmuş olabilir.':'E-posta isteği gönderilemedi. Biraz sonra tekrar deneyin.');}
  finally{setBusy(false);}
 };
 return <main className="min-h-screen flex items-center justify-center p-6 bg-background"><div className="w-full max-w-sm space-y-4 card-elevated p-6">
 <h1 className="text-xl font-bold">{resetting?'Yeni şifre belirle':'Şifremi unuttum'}</h1>
 {saved?<><p>Şifren kaydedildi.</p><Link to="/admin/reports" className="text-primary underline">Şikâyet ekranına geç</Link></>:sent?<p>Bu e-posta için uygun bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</p>:resetting&&checking?<p>Bağlantı kontrol ediliyor…</p>:resetting&&!sessionEmail?<><p>Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.</p><Link to="/forgot-password" className="text-primary underline">Yeni bağlantı iste</Link></>:<form onSubmit={submit} className="space-y-4">
 {resetting?<><p className="text-sm">Şifresi değişecek hesap: {sessionEmail}</p><Label htmlFor="new-password">Yeni şifre</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/><Label htmlFor="confirm-password">Yeni şifre tekrar</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></>:<><Label htmlFor="recovery-email">Hesap e-postası</Label><Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></>}
 <Button type="submit" disabled={busy} className="w-full">{busy?'Bekleyin…':resetting?'Şifreyi kaydet':'Sıfırlama bağlantısı gönder'}</Button>
 </form>}
 <Link to="/auth" className="block text-sm text-primary underline">Giriş ekranı</Link>
 </div></main>;
}
