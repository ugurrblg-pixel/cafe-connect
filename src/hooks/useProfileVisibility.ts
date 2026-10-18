import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {invalidateVisibleProfiles} from '@/lib/visibilityEvents';
import {toast} from 'sonner';

export function useProfileVisibility(){
 const {user,refreshProfile}=useAuth();
 const [state,setState]=useState<{owner:string;visible:boolean|null;error:boolean}>({owner:'',visible:null,error:false});
 const [saving,setSaving]=useState(false);
 const generation=useRef(0),busy=useRef(false),active=useRef(user?.id);active.current=user?.id;
 const load=useCallback(async()=>{
  const owner=user?.id,version=++generation.current;
  setState({owner:owner||'',visible:null,error:false});if(!owner)return;
  try{const {data,error}=await supabase.from('profiles').select('is_visible').eq('user_id',owner).single();
   if(version!==generation.current||active.current!==owner)return;
   if(error||typeof data?.is_visible!=='boolean')throw error||new Error('Missing visibility');
   setState({owner,visible:data.is_visible,error:false});
  }catch{if(version===generation.current&&active.current===owner)setState({owner,visible:null,error:true});}
 },[user?.id]);
 useEffect(()=>{busy.current=false;setSaving(false);void load();return()=>{++generation.current;};},[load]);
 const save=async(visible:boolean)=>{
  const owner=user?.id,version=generation.current;
  if(!owner||state.owner!==owner||state.visible===null||busy.current)return;
  busy.current=true;setSaving(true);
  try{
   const {data,error}=await supabase.from('profiles').update({is_visible:visible}).eq('user_id',owner).select('is_visible').single();
   if(version!==generation.current||active.current!==owner)return;
   if(error||data?.is_visible!==visible)throw error||new Error('Visibility not saved');
   setState({owner,visible,error:false});invalidateVisibleProfiles();
   toast.success(visible?'Profilin görünür':'Profilin gizlendi');
   void refreshProfile().catch(()=>{/* The server-confirmed visibility remains authoritative. */});
  }catch{if(version===generation.current&&active.current===owner)toast.error('Görünürlük kaydedilemedi. Önceki ayarın korundu.');}
  finally{if(version===generation.current&&active.current===owner){busy.current=false;setSaving(false);}}
 };
 const current=state.owner===user?.id;
 return {visible:current?state.visible:null,error:current&&state.error,loading:!!user&&(!current||state.visible===null&&!state.error),saving,save,reload:load};
}
