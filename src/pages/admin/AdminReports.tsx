import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
interface ReportRow {id:string;reporter_name:string;reported_name:string;reason:string;description:string|null;status:string;created_at:string}
export default function AdminReports(){
 const {user}=useAuth();
 const [rows,setRows]=useState<ReportRow[]>([]);
 const [filter,setFilter]=useState('pending');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState(false);
 const [busy,setBusy]=useState(false);
 const [revision,setRevision]=useState(0);
 const scope=useRef(0);
 const owner=useRef(user?.id);owner.current=user?.id;
 useEffect(()=>{
  const current=++scope.current;setRows([]);setError(false);setLoading(!!user);setBusy(false);
  if(user)void Promise.resolve(supabase.rpc('list_admin_reports',{report_filter:filter})).then(({data,error})=>{
   if(current!==scope.current)return;
   if(error||!Array.isArray(data)){setError(true);return;}
   setRows(data as unknown as ReportRow[]);
  }).catch(()=>{if(current===scope.current)setError(true);}).finally(()=>{if(current===scope.current)setLoading(false);});
  return ()=>{++scope.current;};
 },[user?.id,filter,revision]);
 const review=async(id:string,status:string)=>{
  if(busy||!user)return;const current=scope.current;const caller=user.id;setBusy(true);
  try{
   const {error}=await supabase.rpc('review_admin_report',{target_report_id:id,new_status:status});
   if(current!==scope.current||owner.current!==caller)return;
   if(error)throw error;
   toast.success('İnceleme kaydedildi');setRevision(value=>value+1);
  }catch{if(current===scope.current&&owner.current===caller)toast.error('İnceleme kaydedilemedi');}
  finally{if(current===scope.current)setBusy(false);}
 };
 return <AdminLayout><h1 className="text-2xl font-bold mb-2">Şikâyet inceleme</h1>
 <p className="text-muted-foreground mb-4">Son 100 şikâyet. İnceleme kaydı kullanıcıyı otomatik olarak engellemez.</p>
 <div className="flex gap-2 mb-4">{[['pending','Bekleyen'],['reviewed','İncelenen'],['all','Tümü']].map(([value,label])=><Button key={value} disabled={busy} variant={filter===value?'default':'outline'} onClick={()=>setFilter(value)}>{label}</Button>)}</div>
 {loading?<p>Yükleniyor…</p>:error?<div role="alert">Şikâyetler yüklenemedi veya yetkiniz yok. <Button onClick={()=>setRevision(value=>value+1)}>Tekrar dene</Button></div>:rows.length===0?<p>Bu listede şikâyet bulunmuyor.</p>:<div className="space-y-4">{rows.map(row=><article key={row.id} className="bg-card border rounded-xl p-4 space-y-2">
 <h2 className="font-semibold">{row.reporter_name} → {row.reported_name}</h2>
 <p>{({spam:'Spam',harassment:'Taciz',inappropriate:'Uygunsuz davranış'} as Record<string,string>)[row.reason]||row.reason}</p>
 <p className="text-sm text-muted-foreground">{row.status} · {new Date(row.created_at).toLocaleString('tr-TR')}</p>
 {row.description&&<p className="whitespace-pre-wrap break-words">{row.description}</p>}
 {row.status==='pending'&&<div className="flex gap-2"><Button disabled={busy} onClick={()=>review(row.id,'reviewed')}>İncelendi olarak işaretle</Button><Button variant="outline" disabled={busy} onClick={()=>review(row.id,'dismissed')}>Kapat</Button></div>}
 </article>)}</div>}</AdminLayout>;
}
