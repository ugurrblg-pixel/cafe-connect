import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
interface Request {id:string;user_id:string;display_name:string;status:string;reason:string|null;created_at:string;photo_path:string|null;selfie_path:string|null}
interface Evidence {id:string;photo:string;selfie:string;expires:number}
const filters=[['pending','Bekleyen'],['approved','Onaylanan'],['rejected','Reddedilen']];
export default function AdminVerification(){
 const {user}=useAuth();
 const enabled=import.meta.env.VITE_ACCOUNT_VERIFICATION_ENABLED==='true';
 const [filter,setFilter]=useState('pending');const [rows,setRows]=useState<Request[]>([]);
 const [loading,setLoading]=useState(enabled);const [error,setError]=useState(false);const [busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0);const [evidence,setEvidence]=useState<Evidence|null>(null);
 const [loaded,setLoaded]=useState({photo:false,selfie:false});
 const [selected,setSelected]=useState<string|null>(null);
 const [compared,setCompared]=useState(false);const [reason,setReason]=useState('');
 const scope=useRef(0);
 useEffect(()=>{
  const current=++scope.current;setRows([]);setError(false);setLoading(enabled&&!!user);setBusy(false);setEvidence(null);setLoaded({photo:false,selfie:false});setSelected(null);setCompared(false);setReason('');
  if(enabled&&user)void Promise.resolve(supabase.rpc('list_admin_account_verifications',{status_filter:filter})).then(({data,error})=>{
   if(current!==scope.current)return;if(error||!Array.isArray(data)){setError(true);return;}setRows(data as unknown as Request[]);
  }).catch(()=>{if(current===scope.current)setError(true);}).finally(()=>{if(current===scope.current)setLoading(false);});
  return()=>{++scope.current;};
 },[enabled,user?.id,filter,revision]);
 const openEvidence=async(row:Request)=>{
  if(busy||!row.photo_path||!row.selfie_path)return;const current=scope.current;setBusy(true);setEvidence(null);setLoaded({photo:false,selfie:false});setSelected(row.id);setCompared(false);setReason('');
  try{
   const results=await Promise.all([supabase.storage.from('avatars').createSignedUrl(row.photo_path,300),supabase.storage.from('verification-selfies').createSignedUrl(row.selfie_path,300)]);
   if(results.some(r=>r.error||!r.data?.signedUrl))throw new Error('Unavailable');
   if(current===scope.current)setEvidence({id:row.id,photo:results[0].data!.signedUrl,selfie:results[1].data!.signedUrl,expires:Date.now()+300_000});
  }catch{if(current===scope.current)toast.error('Görseller açılamadı. Başvuru süresi dolmuş veya yetkin yetersiz olabilir.');}
  finally{if(current===scope.current)setBusy(false);}
 };
 const review=async(row:Request,decision:'approved'|'rejected')=>{
  if(busy||!user)return;
  if(decision==='approved'&&(!loaded.photo||!loaded.selfie||!compared||evidence?.id!==row.id||evidence.expires<=Date.now())){toast.error('İki görseli yeniden açıp karşılaştır.');return;}
  if(decision==='rejected'&&reason.trim().length<5){toast.error('En az 5 karakterlik bir ret gerekçesi yaz.');return;}
  const current=scope.current;setBusy(true);
  try{
   const {error}=await supabase.rpc('review_account_verification',{request_id:row.id,decision,rejection_reason:decision==='rejected'?reason.trim():null});if(error)throw error;
   if(current===scope.current){toast.success(decision==='approved'?'Hesap doğrulandı.':'Başvuru gerekçesiyle reddedildi.');setRevision(v=>v+1);}
  }catch{if(current===scope.current)toast.error('Karar kaydedilemedi. Başvuru veya ana fotoğraf değişmiş olabilir. Listeyi yenileyip tekrar kontrol et.');}
  finally{if(current===scope.current)setBusy(false);}
 };
 return <AdminLayout>
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">Hesap doğrulama</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Selfieyi başvuru anındaki ana fotoğrafla karşılaştır. Bu işlem resmi kimlik kontrolü değildir. Kendi hesabını onaylayamazsın.</p></div><Button variant="outline" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Listeyi yenile</Button></div>
  {!enabled?<p>Doğrulama başvuruları henüz açılmadı.</p>:<>
   <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Başvuru durumu">{filters.map(([value,label])=><Button key={value} variant={filter===value?'default':'outline'} aria-pressed={filter===value} disabled={busy} onClick={()=>setFilter(value)}>{label}</Button>)}</div>
   {loading?<p role="status">Başvurular yükleniyor…</p>:error?<div role="alert">Başvurular alınamadı veya inceleme yetkin yok. <Button variant="outline" onClick={()=>setRevision(v=>v+1)}>Tekrar dene</Button></div>:rows.length===0?<p className="py-8 text-muted-foreground">Bu listede başvuru bulunmuyor.</p>:<div className="space-y-6">{rows.map(row=><article key={row.id} className="rounded-xl border bg-card p-4 sm:p-6">
   <div className="mb-4"><h2 className="break-words font-semibold">{row.display_name}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString('tr-TR')}</p></div>
   {row.reason&&<p className="mb-4 break-words text-sm">Gerekçe: {row.reason}</p>}
   {filter==='pending'&&<>
    {evidence?.id===row.id?<div className="space-y-4">
     <div className="grid gap-4 sm:grid-cols-2"><figure><figcaption className="mb-2 text-sm font-medium">Ana profil fotoğrafı</figcaption><img src={evidence.photo} alt="Başvuru anındaki ana profil fotoğrafı" referrerPolicy="no-referrer" className="h-64 w-full rounded-lg bg-secondary object-contain" onLoad={()=>setLoaded(v=>({...v,photo:true}))} onError={()=>{setEvidence(null);setLoaded({photo:false,selfie:false});setCompared(false);toast.error('Görselin süresi dolmuş olabilir. Yeniden aç.');}}/></figure><figure><figcaption className="mb-2 text-sm font-medium">Doğrulama selfiesi</figcaption><img src={evidence.selfie} alt="Kullanıcının doğrulama için gönderdiği selfie" referrerPolicy="no-referrer" className="h-64 w-full rounded-lg bg-secondary object-contain" onLoad={()=>setLoaded(v=>({...v,selfie:true}))} onError={()=>{setEvidence(null);setLoaded({photo:false,selfie:false});setCompared(false);}}/></figure></div>
     <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={compared} disabled={busy||!loaded.photo||!loaded.selfie} onChange={e=>setCompared(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary"/>İki görseli inceledim; aynı kişiyi gösterdiklerini değerlendiriyorum.</label>
    </div>:<Button variant="outline" disabled={busy||!row.photo_path||!row.selfie_path} onClick={()=>openEvidence(row)}>Fotoğraf ve selfieyi aç</Button>}
    {!row.selfie_path&&<p className="mt-2 text-sm text-muted-foreground">İnceleme süresi doldu. Kullanıcıdan yeni başvuru isteyerek gerekçeli reddet.</p>}
    <div className="mt-4 space-y-3"><label className="block text-sm" htmlFor={`reason-${row.id}`}>Ret gerekçesi (yalnız reddederken zorunlu)</label><textarea id={`reason-${row.id}`} maxLength={300} disabled={busy} value={selected===row.id?reason:''} onFocus={()=>{if(selected!==row.id){setSelected(row.id);setReason('');}}} onChange={e=>setReason(e.target.value)} className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/><div className="flex flex-wrap gap-2"><Button disabled={busy||!loaded.photo||!loaded.selfie||!compared||evidence?.id!==row.id||!evidence.photo} onClick={()=>review(row,'approved')}>Hesabı onayla</Button><Button variant="outline" disabled={busy||selected!==row.id||reason.trim().length<5} onClick={()=>review(row,'rejected')}>Gerekçeyle reddet</Button></div></div>
   </>}
  </article>)}</div>}
  </>}
 </AdminLayout>;
}



