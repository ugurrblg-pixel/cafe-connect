import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnedInteractionList } from './useOwnedInteractionList';
import { toast } from 'sonner';

interface Wave {
 id: string; fromUserId: string; toUserId: string; cafeId: string; createdAt: Date;
 fromUser?: { displayName: string; photoUrl: string };
}
export function useWaves() {
 const { user } = useAuth();
 const enabled=import.meta.env.VITE_CAFE_WAVES_ENABLED==='true';
 const load=useCallback(async ():Promise<Wave[]> => {
  const { data,error }=await supabase.rpc('list_own_current_waves');
  if(error) throw error;
  return (data||[]).map(row=>({id:row.id,fromUserId:row.from_user_id,toUserId:row.to_user_id,cafeId:row.cafe_id,
   createdAt:new Date(row.created_at),fromUser:{displayName:row.display_name||'Kullanıcı',photoUrl:''}}));
 },[]);
 const { rows,loading,refetch }=useOwnedInteractionList(load,enabled);
 const busy=useRef(false);
 const sendWave=async(toUserId:string,cafeId:string):Promise<{success:boolean;isMatch?:boolean}>=>{
  if(!user||busy.current) return {success:false};
  if(!enabled) {toast.info('Selamlaşma hazırlanıyor.');return {success:false};}
  busy.current=true;
  try {
   const {data,error}=await supabase.rpc('send_own_wave',{target_user_id:toUserId,target_cafe_id:cafeId});
   if(error) throw error;
   await refetch();
   return {success:true,isMatch:!!(data&&typeof data==='object'&&!Array.isArray(data)&&data.is_match===true)};
  } catch(error) {
   const message=(error as {message?:string}).message||'';
   toast.error(message.includes('Daily wave limit')?'Günlük 3 selam sınırına ulaştın.':message.includes('Target unavailable')?'Bu kişiye şu anda selam gönderilemiyor.':'Selam gönderilemedi.');
   return {success:false};
  } finally {busy.current=false;}
 };
 const sentWaves=rows.filter(row=>row.fromUserId===user?.id);
 const incomingWaves=rows.filter(row=>row.toUserId===user?.id);
 return {incomingWaves,sentWaves,loading,sendWave,refetch,
  hasWavedAt:(id:string,cafe:string)=>sentWaves.some(row=>row.toUserId===id&&row.cafeId===cafe),
  hasReceivedWaveFrom:(id:string,cafe:string)=>incomingWaves.some(row=>row.fromUserId===id&&row.cafeId===cafe)};
}
