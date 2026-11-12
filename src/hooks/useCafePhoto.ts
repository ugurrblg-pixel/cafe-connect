import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseCafePhoto } from '@/lib/cafePhotos';
import { VISIBILITY_CHANGED } from '@/lib/visibilityEvents';

// In-memory display only. Revalidate access without downloading unchanged image bytes.
export function useCafePhoto(reference:string,userId?:string):string|undefined {
 const [resolved,setResolved]=useState<{reference:string;userId:string;url:string}|null>(null);
 useEffect(()=>{
  const target=parseCafePhoto(reference);
  if(!target||!userId||import.meta.env.VITE_CAFE_PHOTOS_ENABLED!=='true')return;
  let cancelled=false,busy=false,objectId:string|null=null,url:string|null=null;
  let version=0;
  let expiry:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{++version;objectId=null;if(url)URL.revokeObjectURL(url);url=null;clearTimeout(expiry);if(!cancelled)setResolved(null);};
  const refresh=async()=>{
   if(cancelled||busy||document.visibilityState!=='visible')return;
   busy=true;
   const requestVersion=version;
   try{
    const {data:access,error}=await supabase.functions.invoke('cafe-photo',{body:{...target,mode:'authorize'}});
    if(cancelled||requestVersion!==version||document.visibilityState!=='visible')return;
    if(error||typeof access?.objectId!=='string'){clear();return;}
    clearTimeout(expiry);expiry=setTimeout(clear,31_000);
    if(objectId===access.objectId&&url)return;
    clear();expiry=setTimeout(clear,31_000);
    const downloadVersion=version;
    // FunctionsClient decodes image/webp as text. Read the authenticated response as bytes.
    const {data:{session},error:sessionError}=await supabase.auth.getSession();
    if(cancelled||downloadVersion!==version)return;
    if(sessionError||session?.user.id!==userId){clear();return;}
    const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cafe-photo`,{
      method:'POST',
      headers:{
        Authorization:`Bearer ${session.access_token}`,
        apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type':'application/json',
      },
      body:JSON.stringify({...target,mode:'image'}),
      cache:'no-store',
    });
    const photo=response.ok&&response.headers.get('content-type')?.split(';')[0]==='image/webp'
      ?await response.blob():null;
    if(cancelled||downloadVersion!==version||document.visibilityState!=='visible')return;
    if(!photo?.size){clear();return;}
    url=URL.createObjectURL(photo);objectId=access.objectId;
    clearTimeout(expiry);expiry=setTimeout(clear,31_000);
    setResolved({reference,userId,url});
   }catch{if(!cancelled)clear();}finally{busy=false;}
  };
  void refresh();
  const timer=setInterval(()=>void refresh(),25_000);
  const visible=()=>{if(document.visibilityState==='visible')void refresh();else clear();};
  document.addEventListener('visibilitychange',visible);
  const invalidate=()=>{clear();void refresh();};
  window.addEventListener(VISIBILITY_CHANGED,invalidate);
  return()=>{cancelled=true;clearInterval(timer);clearTimeout(expiry);if(url)URL.revokeObjectURL(url);document.removeEventListener('visibilitychange',visible);window.removeEventListener(VISIBILITY_CHANGED,invalidate);};
 },[reference,userId]);
 return resolved?.reference===reference&&resolved.userId===userId?resolved.url:undefined;
}
