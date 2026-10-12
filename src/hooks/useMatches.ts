import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnedInteractionList } from './useOwnedInteractionList';
import { toast } from 'sonner';

export function useMatches() {
 const {user}=useAuth();
 const load=useCallback(async()=>{
  const {data,error}=await supabase.rpc('list_own_current_matches');
  if(error) throw error;
  return (data||[]).map(row=>({id:row.id,user1Id:row.user1_id,user2Id:row.user2_id,cafeId:row.cafe_id,
   conversationId:row.conversation_id,createdAt:new Date(row.created_at),
   otherUser:{userId:row.user1_id===user?.id?row.user2_id:row.user1_id,displayName:row.display_name||'Kullanıcı',photoUrl:''}}));
 },[user?.id]);
 const {rows:matches,loading,refetch}=useOwnedInteractionList(load,import.meta.env.VITE_CAFE_WAVES_ENABLED==='true');
 const find=(id:string,cafeId?:string)=>matches.find(row=>row.otherUser.userId===id&&(!cafeId||row.cafeId===cafeId));
 return {matches,loading,refetch,
  hasMatchWith:(id:string,cafeId?:string)=>!!find(id,cafeId),
  getMatchConversation:(id:string,cafeId?:string)=>find(id,cafeId)?.conversationId||null,
  createConversationForMatch:async(matchId:string):Promise<string|null>=>{
   if(import.meta.env.VITE_SAFE_CHAT_ENABLED!=='true'){toast.info('Mesajlaşma hazırlanıyor.');return null;}
   const {data,error}=await supabase.rpc('open_own_match_chat',{target_match_id:matchId});
   if(error){toast.error('Sohbet açılamadı.');return null;}await refetch();return data;
  }};
}
