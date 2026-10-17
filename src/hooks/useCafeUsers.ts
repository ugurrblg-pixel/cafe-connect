import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cafePhotoReference } from '@/lib/cafePhotos';
import type { Database } from '@/integrations/supabase/types';
import { VISIBILITY_CHANGED } from '@/lib/visibilityEvents';
interface CafeUser {
 id:string;userId:string;name:string;displayName:string;age:number|null;bio:string;photoUrl:string;photoUrls:string[];
 purpose:'chat'|'friendship'|'dating';allowDMs:boolean;isVisible:boolean;isVerified:boolean;checkedInAt:Date;lastActiveAt:Date;hobbies:string[];
}
type Member=Database['public']['Functions']['list_current_cafe_members']['Returns'][number]&{photo_refs?:string[]};
export function useCafeUsers(cafeId:string,options:{isCheckedIn?:boolean}={}){
 const {user}=useAuth();
 const [users,setUsers]=useState<CafeUser[]>([]);const [loading,setLoading]=useState(true);
 const [loadedScope,setLoadedScope]=useState('');
 const [connectionStatus,setConnectionStatus]=useState<'connecting'|'connected'|'disconnected'>('disconnected');
 const generation=useRef(0);const request=useRef(0);
 const fetchActiveUsers=useCallback(async()=>{
  const scope=generation.current,sequence=++request.current;
  const current=()=>generation.current===scope&&request.current===sequence;
  if(!user||!cafeId||!options.isCheckedIn){setUsers([]);setLoading(false);setConnectionStatus('disconnected');return;}
  try{
   if(import.meta.env.VITE_CAFE_MEMBER_LIST_ENABLED!=='true'){setUsers([]);setConnectionStatus('disconnected');return;}
   const photosEnabled=import.meta.env.VITE_CAFE_PHOTOS_ENABLED==='true';
   const {data,error}=await supabase.rpc(photosEnabled?'list_current_cafe_profiles':'list_current_cafe_members',{target_cafe_id:cafeId});
   if(error||!Array.isArray(data))throw error||new Error('Invalid members');if(!current())return;
   setUsers((data as Member[]).map(row=>{
    const photos=photosEnabled?(row.photo_refs||[]).flatMap(ref=>{const value=cafePhotoReference(cafeId,ref);return value?[value]:[];}):[];
    return {id:row.id,userId:row.user_id,name:row.display_name||'Kullanıcı',displayName:row.display_name||'Kullanıcı',age:row.age,bio:row.bio||'',photoUrl:photos[0]||'',photoUrls:photos,purpose:row.purpose as CafeUser['purpose'],allowDMs:row.allow_dms,isVisible:true,isVerified:row.is_verified,hobbies:row.hobbies||[],checkedInAt:new Date(row.check_in_time),lastActiveAt:new Date(row.last_active_at||row.check_in_time)};
   }));setLoadedScope(`${user.id}:${cafeId}`);setConnectionStatus('connected');
  }catch{if(current()){setUsers([]);setConnectionStatus('disconnected');}}
  finally{if(current())setLoading(false);}
 },[cafeId,user?.id,options.isCheckedIn]);
 useEffect(()=>{
  ++generation.current;setUsers([]);setLoading(true);setConnectionStatus('connecting');void fetchActiveUsers();
  const interval=setInterval(()=>{if(document.visibilityState==='visible')void fetchActiveUsers();},30000);
  const visible=()=>{if(document.visibilityState==='visible')void fetchActiveUsers();else {++request.current;setUsers([]);}};
  document.addEventListener('visibilitychange',visible);
  const invalidate=()=>{++request.current;setUsers([]);void fetchActiveUsers();};
  window.addEventListener(VISIBILITY_CHANGED,invalidate);
  return()=>{++generation.current;clearInterval(interval);document.removeEventListener('visibilitychange',visible);window.removeEventListener(VISIBILITY_CHANGED,invalidate);};
 },[fetchActiveUsers]);
 return {users:user&&options.isCheckedIn&&loadedScope===`${user.id}:${cafeId}`?users:[],loading,connectionStatus,refetch:fetchActiveUsers};
}
