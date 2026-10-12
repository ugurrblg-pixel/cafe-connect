import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useChat } from './useConversations';
const mock=vi.hoisted(()=>({user:{id:'viewer'} as any,rpc:vi.fn(),from:vi.fn(),channel:vi.fn(),error:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,from:mock.from,channel:mock.channel}}));
vi.mock('sonner',()=>({toast:{error:mock.error,info:vi.fn()}}));
const payload=(id='chat',messages:any[]=[])=>({id,cafe_id:'cafe',cafe_name:'Cafe',peer_id:'peer',peer_name:'Peer',messages});
beforeEach(()=>{
 vi.clearAllMocks();mock.rpc.mockReset();mock.user={id:'viewer'};vi.stubEnv('VITE_SAFE_CHAT_ENABLED','true');
 mock.rpc.mockImplementation(async(name)=>({data:name==='get_own_chat'?payload():null,error:null}));
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('sends a caller-bound request without table writes or public broadcasts',async()=>{
 const {result}=renderHook(()=>useChat('chat'));await waitFor(()=>expect(result.current.chat).not.toBeNull());
 await act(async()=>expect(await result.current.sendMessage('Hello')).toBe(true));
 const args=mock.rpc.mock.calls.find(call=>call[0]==='send_own_chat_message')[1];
 expect(args).toEqual({target_conversation_id:'chat',message_content:'Hello',request_id:expect.any(String)});
 expect(args.request_id).toMatch(/^[0-9a-f-]{36}$/);
 expect(mock.from).not.toHaveBeenCalled();expect(mock.channel).not.toHaveBeenCalled();
});
it('keeps a failed message retryable with the same request id',async()=>{
 const {result}=renderHook(()=>useChat('chat'));await waitFor(()=>expect(result.current.chat).not.toBeNull());
 mock.rpc.mockImplementation(async(name)=>({data:name==='get_own_chat'?payload():null,error:name==='send_own_chat_message'?{message:'network'}:null}));
 await act(async()=>expect(await result.current.sendMessage('Retry me')).toBe(false));
 expect(result.current.messages[0].status).toBe('failed');
 const id=result.current.messages[0].clientId;
 mock.rpc.mockImplementation(async(name)=>({data:name==='get_own_chat'?payload('chat',[{id:'saved',sender_id:'viewer',content:'Retry me',created_at:'2026-10-09T12:00:00Z',read_at:null,deleted_at:null,client_id:id}]):{id:'saved'},error:null}));
 await act(async()=>expect(await result.current.sendMessage('Retry me',id)).toBe(true));
 expect(result.current.messages).toHaveLength(1);expect(result.current.messages[0].id).toBe('saved');
 expect(mock.rpc.mock.calls.filter(call=>call[0]==='send_own_chat_message').map(call=>call[1].request_id)).toEqual([id,id]);
});
it('does not optimistically hide a message when removal is denied',async()=>{
 const row={id:'saved',sender_id:'viewer',content:'Keep me',created_at:'2026-10-09T12:00:00Z',read_at:null,deleted_at:null,client_id:'key'};
 mock.rpc.mockImplementation(async(name)=>({data:name==='get_own_chat'?payload('chat',[row]):false,error:null}));
 const {result}=renderHook(()=>useChat('chat'));await waitFor(()=>expect(result.current.messages).toHaveLength(1));
 await act(async()=>expect(await result.current.softDeleteMessage('saved')).toBe(false));
 expect(result.current.messages[0].deletedAt).toBeNull();
});
it('ignores the previous conversation response',async()=>{
 let resolve:(value:any)=>void;
 mock.rpc.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
 mock.rpc.mockImplementation(async()=>({data:payload('second'),error:null}));
 const {result,rerender}=renderHook(({id})=>useChat(id),{initialProps:{id:'first'}});
 rerender({id:'second'});await waitFor(()=>expect(result.current.chat?.id).toBe('second'));
 await act(async()=>resolve({data:payload('first'),error:null}));
 expect(result.current.chat.id).toBe('second');
});
it('rejects blank and oversize text without a send request',async()=>{
 const {result}=renderHook(()=>useChat('chat'));await waitFor(()=>expect(result.current.chat).not.toBeNull());
 await act(async()=>{expect(await result.current.sendMessage('  ')).toBe(false);expect(await result.current.sendMessage('x'.repeat(2001))).toBe(false);});
 expect(mock.rpc.mock.calls.some(call=>call[0]==='send_own_chat_message')).toBe(false);
});
it('does not load a chat while activation is disabled',async()=>{
 vi.stubEnv('VITE_SAFE_CHAT_ENABLED','false');const {result}=renderHook(()=>useChat('chat'));
 await waitFor(()=>expect(result.current.loading).toBe(false));expect(mock.rpc).not.toHaveBeenCalled();
});
