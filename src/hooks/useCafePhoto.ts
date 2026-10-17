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
    const {data:photo,error:photoError}=await supabase.functions.invoke('cafe-photo',{body:{...target,mode:'image'}});
    if(cancelled||downloadVersion!==version||document.visibilityState!=='visible')return;
    if(photoError||!(photo instanceof Blob)||photo.type!=='image/webp'){clear();return;}
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
