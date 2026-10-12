import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOwnedInteractionList } from './useOwnedInteractionList';
import { toast } from 'sonner';
export interface InboxConversation {
 matchId:string;conversationId:string|null;otherUserId:string;otherUserName:string;otherUserPhotoUrl:string;cafeName:string;cafeId:string;
 lastMessage?:{content:string;createdAt:Date;senderId:string};unreadCount:number;matchedAt:Date;lastActiveAt?:Date;
}
interface InboxRow {
 match_id:string;conversation_id:string|null;peer_id:string;peer_name:string;cafe_name:string;cafe_id:string;
 last_content:string|null;last_created_at:string|null;last_sender_id:string|null;unread_count:number;matched_at:string;
}
export function useInboxData() {
 const enabled=import.meta.env.VITE_SAFE_CHAT_ENABLED==='true';
 const load=useCallback(async():Promise<InboxConversation[]>=>{
  const {data,error}=await supabase.rpc('list_own_chat_inbox');if(error)throw error;
  const rows=data as unknown as InboxRow[];if(!Array.isArray(rows))throw new Error('Invalid inbox');
  return rows.map(r=>({matchId:r.match_id,conversationId:r.conversation_id,otherUserId:r.peer_id,otherUserName:r.peer_name||'Kullanıcı',
   otherUserPhotoUrl:'',cafeName:r.cafe_name,cafeId:r.cafe_id,unreadCount:r.unread_count,matchedAt:new Date(r.matched_at),
   lastMessage:r.last_created_at?{content:r.last_content||'',createdAt:new Date(r.last_created_at),senderId:r.last_sender_id||''}:undefined}));
 },[]);
 const {rows:conversations,loading,error,refetch}=useOwnedInteractionList(load,enabled);
 const createConversation=async(matchId:string)=>{
  if(!enabled){toast.info('Mesajlaşma hazırlanıyor.');return null;}
  const {data,error}=await supabase.rpc('open_own_match_chat',{target_match_id:matchId});
  if(error){toast.error('Sohbet açılamadı. İki taraf da aynı kafede aktif ve görünür olmalı.');return null;}
  await refetch();return data;
 };
 return {conversations,loading,error,createConversation,refetch};
}
