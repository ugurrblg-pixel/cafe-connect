import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, Loader2, Camera, Hand } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { prepareProfilePhoto } from '@/lib/privatePhotos';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
interface Props { verificationStatus: string; onStatusChange?: (status: string) => void }
interface Request { id: string; status: string; reason: string | null; created_at: string }
export function VerificationRequest({ verificationStatus, onStatusChange }: Props) {
 const enabled = import.meta.env.VITE_ACCOUNT_VERIFICATION_ENABLED === 'true';
 const { user } = useAuth();
 const [request,setRequest] = useState<Request|null>(null);
 const [loading,setLoading] = useState(enabled);
 const [failed,setFailed] = useState(false);
 const [busy,setBusy] = useState(false);
 const [consent,setConsent] = useState(false);
 const [revision,setRevision] = useState(0);
 const input = useRef<HTMLInputElement>(null);
 const scope = useRef(0);
 useEffect(()=>{
  const current=++scope.current;setRequest(null);setConsent(false);setBusy(false);setFailed(false);setLoading(enabled&&!!user);
  if(enabled&&user)void Promise.resolve(supabase.rpc('get_own_account_verification')).then(({data,error})=>{
   if(current!==scope.current)return;if(error){setFailed(true);return;}setRequest(data as unknown as Request|null);
  }).catch(()=>{if(current===scope.current)setFailed(true);}).finally(()=>{if(current===scope.current)setLoading(false);});
  return ()=>{++scope.current;};
 },[enabled,user?.id,revision]);
 const status=request?(request.status==='withdrawn'?'none':request.status):verificationStatus;
 const approved=status==='approved';const pending=status==='pending';
 const Icon=approved?CheckCircle2:pending?Clock:ShieldCheck;
 const clearUnused = async (caller:string) => {
  const bucket=supabase.storage.from('verification-selfies');
  const {data,error}=await bucket.list(caller,{limit:10});if(error)throw error;
  const paths=(data||[]).filter(item=>item.id).map(item=>`${caller}/${item.name}`);
  if(paths.length){const {error}=await bucket.remove(paths);if(error)throw error;}
 };
 const submit=async(file?:File)=>{
  if(!file||!user||!consent||busy||pending||approved)return;
  const current=scope.current;const caller=user.id;setBusy(true);let uploaded:string|null=null;
  try{
   const prepared=await prepareProfilePhoto(file);if(current!==scope.current)return;
   await clearUnused(caller);if(current!==scope.current)return;
   const path=`${caller}/${crypto.randomUUID()}.webp`;
   const {error:uploadError}=await supabase.storage.from('verification-selfies').upload(path,prepared,{upsert:false,contentType:'image/webp'});
   if(uploadError)throw uploadError;uploaded=path;if(current!==scope.current)return;
   const {error}=await supabase.rpc('submit_own_account_verification',{selfie_object_path:path,consent:true});if(error)throw error;
   uploaded=null;if(current===scope.current){onStatusChange?.('pending');setRevision(v=>v+1);toast.success('Başvurun alındı. Yönetici incelemesi bekleniyor.');}
  }catch(error){if(current===scope.current){const message=error&&typeof error==='object'&&'message'in error?String(error.message):'';
   toast.error(message.includes('reviewed main')?'Önce Profil → Düzenle bölümünden denetimden geçen bir ana fotoğraf yükle.':message.includes('Daily request')?'Bugünkü başvuru sınırına ulaştın. Yarın tekrar deneyebilirsin.':'Başvuru gönderilemedi. Ana fotoğrafını kontrol edip tekrar dene.');}}
  finally{if(uploaded)await supabase.storage.from('verification-selfies').remove([uploaded]).catch(()=>undefined);if(current===scope.current){setBusy(false);if(input.current)input.current.value='';}}
 };
 const withdraw=async()=>{
  if(busy||!user)return;const current=scope.current;setBusy(true);
  try{const {error}=await supabase.rpc('withdraw_own_account_verification');if(error)throw error;
   if(current===scope.current){onStatusChange?.('none');setRevision(v=>v+1);toast.success('Başvurun geri çekildi.');}
  }catch{if(current===scope.current)toast.error('Başvuru geri çekilemedi. Tekrar dene.');}finally{if(current===scope.current)setBusy(false);}
 };
 const removeSelfie=async()=>{
  if(busy||!user||pending)return;const current=scope.current;setBusy(true);
  try{await clearUnused(user.id);if(current===scope.current)toast.success('Kaydedilmiş doğrulama selfielerin silindi.');}
  catch{if(current===scope.current)toast.error('Selfie silinemedi. Tekrar dene.');}finally{if(current===scope.current)setBusy(false);}
 };
 return <div className="space-y-4">
  <div className="flex items-start gap-3"><Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${approved?'text-accent':'text-muted-foreground'}`}/>
   <div className="min-w-0"><p className="text-sm font-medium">{approved?'Doğrulanmış hesap':pending?'Başvurun bekliyor':status==='rejected'?'Başvurun onaylanmadı':'Selfie ile hesap doğrulama'}</p>
   <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{approved?'Hesabın yönetici tarafından onaylandı.':pending?'Selfie ve başvuru anındaki ana fotoğrafın yönetici tarafından karşılaştırılacak.':enabled?'Sağ elini kaldırarak, yüzünün ve sağ elinin net göründüğü güncel bir selfie çek. Selfien ana profil fotoğrafınla birlikte yönetici tarafından incelenecek.':'Selfie ile doğrulama henüz kullanılamıyor.'}</p></div>
  </div>
  {enabled&&(loading?<p role="status" className="text-sm text-muted-foreground">Başvuru durumu yükleniyor…</p>:failed?<div role="alert" className="text-sm">Başvuru durumu alınamadı. <Button variant="outline" onClick={()=>setRevision(v=>v+1)}>Tekrar dene</Button></div>:<>
   {request?.reason&&status==='rejected'&&<p className="break-words text-sm">Gerekçe: {request.reason}</p>}
   {pending&&<><p className="text-xs text-muted-foreground">İnceleme için görseller 7 gün erişilebilir. Süre dolduysa başvurunu geri çekip yeniden gönderebilirsin.</p><Button variant="outline" disabled={busy} onClick={withdraw}>Başvuruyu geri çek</Button></>}
   {!approved&&!pending&&<>
    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-brand-soft p-4"><Hand aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary"/><div><p className="text-sm font-bold">Sağ elini kaldır, yüzün net görünsün</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Aydınlık bir yerde kameraya bak. Sağ elini yüzünü kapatmadan kaldır; yüzün ve elin aynı karede görünsün. Kamera önizlemesi aynalı olabilir.</p></div></div>
    <p className="text-xs leading-relaxed text-muted-foreground">Kimlik belgesi gönderme. Selfie profilinde yayınlanmaz. Bu işlem otomatik yüz tanıma veya resmi kimlik doğrulaması değildir. İnceleme sonrası selfieyi buradan silebilirsin.</p>
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary"/>Selfiemin ve ana profil fotoğrafımın hesap doğrulaması için yetkili yöneticilerce incelenmesine izin veriyorum.</label>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" capture="user" aria-label="Doğrulama selfiesi" className="hidden" onChange={e=>void submit(e.target.files?.[0])}/>
    <Button disabled={!consent||busy||!user} onClick={()=>input.current?.click()}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Camera className="mr-2 h-4 w-4"/>}{busy?'Başvuru gönderiliyor…':'Selfie seç ve başvur'}</Button>
   </>}
   {!pending&&request&&<Button variant="outline" disabled={busy} onClick={removeSelfie}>Kaydedilmiş selfieyi sil</Button>}
  </>)}
 </div>;
}
