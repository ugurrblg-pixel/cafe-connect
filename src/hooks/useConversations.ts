import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnedInteractionList } from './useOwnedInteractionList';
import { toast } from 'sonner';
export interface Message {
 id:string;conversationId:string;senderId:string;content:string;createdAt:Date;readAt:Date|null;deletedAt:Date|null;
 status?:'sending'|'sent'|'failed';clientId?:string;
}
export interface ChatPayload {
 id:string;cafe_id:string;cafe_name:string;peer_id:string;peer_name:string;
 messages:{id:string;sender_id:string;content:string;created_at:string;read_at:string|null;deleted_at:string|null;client_id:string}[];
}
export function useChat(conversationId:string) {
 const {user}=useAuth(); const enabled=import.meta.env.VITE_SAFE_CHAT_ENABLED==='true';
 const scope=`${user?.id||''}|${conversationId}`;const currentScope=useRef(scope);currentScope.current=scope;
 const [local,setLocal]=useState<{scope:string;pending:Message[]}>({scope:'',pending:[]});
 const busy=useRef(false);
 const load=useCallback(async()=>{
  const {data,error}=await supabase.rpc('get_own_chat',{target_conversation_id:conversationId});if(error)throw error;
  const payload=data as unknown as ChatPayload;
  if(!payload||!Array.isArray(payload.messages))throw new Error('Invalid chat');
  if(document.visibilityState==='visible') {
   const ids=payload.messages.filter(m=>m.sender_id!==user?.id&&!m.read_at&&!m.deleted_at).map(m=>m.id);
   if(ids.length)await supabase.rpc('mark_own_chat_read',{target_conversation_id:conversationId,message_ids:ids});
  }
  return [payload];
 },[conversationId,user?.id]);
 const {rows,loading,error,refetch}=useOwnedInteractionList(load,enabled&&!!conversationId,conversationId,5000);
 const chat=rows[0]||null;
 const confirmed:Message[]=(chat?.messages||[]).map(m=>({id:m.id,conversationId,senderId:m.sender_id,content:m.content,
  createdAt:new Date(m.created_at),readAt:m.read_at?new Date(m.read_at):null,deletedAt:m.deleted_at?new Date(m.deleted_at):null,status:'sent',clientId:m.client_id}));
 const pending=local.scope===scope?local.pending:[];
 const messages=confirmed.concat(pending.filter(m=>!confirmed.some(saved=>saved.clientId===m.clientId)));
 const sendMessage=useCallback(async(content:string,retryClientId?:string):Promise<boolean>=>{
  const text=content.trim();if(!enabled||!user||!chat||busy.current||!text||text.length>2000)return false;
  const sentScope=scope;const clientId=retryClientId||crypto.randomUUID();busy.current=true;
  const optimistic:Message={id:`temp-${clientId}`,clientId,conversationId,senderId:user.id,content:text,createdAt:new Date(),readAt:null,deletedAt:null,status:'sending'};
  setLocal(previous=>({scope:sentScope,pending:[...(previous.scope===sentScope?previous.pending.filter(m=>m.clientId!==clientId):[]),optimistic]}));
  try {
   const {error}=await supabase.rpc('send_own_chat_message',{target_conversation_id:conversationId,message_content:text,request_id:clientId});if(error)throw error;
   if(currentScope.current!==sentScope)return false;
   setLocal(previous=>previous.scope===sentScope?{...previous,pending:previous.pending.map(m=>m.clientId===clientId?{...m,status:'sent'}:m)}:previous);
   await refetch();return true;
  } catch(cause) {
   if(currentScope.current===sentScope) {
    setLocal(previous=>previous.scope===sentScope?{...previous,pending:previous.pending.map(m=>m.clientId===clientId?{...m,status:'failed'}:m)}:previous);
    toast.error((cause as {message?:string}).message?.includes('rate limit')?'Çok hızlı mesaj gönderiyorsun. Biraz bekle.':'Mesaj gönderilemedi.');
   }
   return false;
  } finally {busy.current=false;}
 },[enabled,user?.id,chat,scope,conversationId,refetch]);
 const softDeleteMessage=async(id:string)=>{
  if(!enabled||!user)return false;
  const {data,error}=await supabase.rpc('remove_own_chat_message',{target_conversation_id:conversationId,target_message_id:id});
  if(error||!data){toast.error('Mesaj kaldırılamadı.');return false;}await refetch();return true;
 };
 return {messages:chat?messages:[],loading,chat,error,sendMessage,retryMessage:(id:string,content:string)=>{void sendMessage(content,id);},softDeleteMessage,refetch};
}
export { useInboxData as useConversations } from './useInboxData';
