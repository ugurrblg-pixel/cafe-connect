import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from 'sonner';
import {readNotificationPrefs,NOTIFICATION_PREFS_CHANGED} from '@/lib/notificationPrefs';
import {VISIBILITY_CHANGED} from '@/lib/visibilityEvents';
interface Counts {waves:number;messages:number}
const empty:Counts={waves:0,messages:0};
export function usePushNotifications(){
 const {user}=useAuth();const [snapshot,setSnapshot]=useState<{userId:string;counts:Counts}|null>(null);
 const generation=useRef(0);const currentIds=useRef<string[]>([]);const request=useRef(0);
 const refetchCounts=useCallback(async()=>{
  if(!user)return;const scope=generation.current,seq=++request.current;
  const enabled=import.meta.env.VITE_CAFE_WAVES_ENABLED==='true';
  const responses=await Promise.allSettled([
   enabled?supabase.rpc('list_own_current_waves'):Promise.resolve({data:[],error:null}),
   enabled?supabase.rpc('list_own_current_matches'):Promise.resolve({data:[],error:null}),
   import.meta.env.VITE_SAFE_CHAT_ENABLED==='true'?supabase.rpc('list_own_chat_inbox'):Promise.resolve({data:[],error:null}),
  ]);
  if(scope!==generation.current||seq!==request.current)return;
  const rows=(index:number):Record<string,unknown>[]=>{const r=responses[index];return r.status==='fulfilled'&&!r.value.error&&Array.isArray(r.value.data)?r.value.data as Record<string,unknown>[]:[];};
  const ids=[...rows(0).filter(row=>row.to_user_id===user.id).map(row=>`wave:${row.id}`),...rows(1).map(row=>`match:${row.id}`)];
  currentIds.current=ids;let seen:string[]=[];try{seen=JSON.parse(localStorage.getItem(`riyo_seen_events_${user.id}`)||'[]');if(!Array.isArray(seen))seen=[];}catch{seen=[];}
  const prefs=readNotificationPrefs(user.id);
  const messages=rows(2).reduce((total,row)=>total+(typeof row.unread_count==='number'?Math.max(0,row.unread_count):0),0);
  setSnapshot({userId:user.id,counts:{waves:prefs.new_matches?ids.filter(id=>!seen.includes(id)).length:0,messages:prefs.new_messages?messages:0}});
 },[user?.id]);
 useEffect(()=>{
  ++generation.current;setSnapshot(null);currentIds.current=[];void refetchCounts();
  const refresh=()=>{if(document.visibilityState==='visible')void refetchCounts();};
  const timer=setInterval(refresh,15000);
  document.addEventListener('visibilitychange',refresh);window.addEventListener(NOTIFICATION_PREFS_CHANGED,refresh);window.addEventListener(VISIBILITY_CHANGED,refresh);
  return()=>{++generation.current;++request.current;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener(NOTIFICATION_PREFS_CHANGED,refresh);window.removeEventListener(VISIBILITY_CHANGED,refresh);};
 },[refetchCounts]);
 const resetUnreadCount=useCallback(async(type:'waves'|'messages'|'all')=>{
  if(!user)return;
  if(type==='waves'||type==='all'){
   try{let seen:unknown=JSON.parse(localStorage.getItem(`riyo_seen_events_${user.id}`)||'[]');if(!Array.isArray(seen))seen=[];localStorage.setItem(`riyo_seen_events_${user.id}`,JSON.stringify([...new Set([...(seen as string[]),...currentIds.current])].slice(-500)));}
   catch{toast.error('Bildirimlerin görüldüğü bu cihazda kaydedilemedi.');return;}
  }
  // Opening the inbox does not mark messages read. Only the chat's validated read RPC does.
  await refetchCounts();
 },[user?.id,refetchCounts]);
 const unavailable=async()=>{toast.info('Telefon bildirimleri henüz kurulmadı. Uygulama içindeki bildirimleri kullanabilirsin.');return false;};
 return {isSubscribed:false,isSupported:false,permission:'unsupported' as const,unreadCounts:user&&snapshot?.userId===user.id?snapshot.counts:empty,subscribe:unavailable,unsubscribe:unavailable,resetUnreadCount,refetchCounts};
}
