import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useInboxData } from './useInboxData';
const mock=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),channel:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'viewer'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:mock}));
vi.mock('sonner',()=>({toast:{info:vi.fn(),error:vi.fn()}}));
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:[],error:null});vi.stubEnv('VITE_SAFE_CHAT_ENABLED','true');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('uses the restricted inbox without fetching peer photos or profiles',async()=>{
 mock.rpc.mockResolvedValue({data:[{match_id:'match',conversation_id:'chat',peer_id:'peer',peer_name:'Peer',cafe_name:'Cafe',cafe_id:'cafe',last_content:'Hello',last_created_at:'2026-10-09T12:00:00Z',last_sender_id:'peer',unread_count:1,matched_at:'2026-10-09T11:00:00Z',photo_url:'private'}],error:null});
 const {result}=renderHook(()=>useInboxData());await waitFor(()=>expect(result.current.conversations).toHaveLength(1));
 expect(result.current.conversations[0].otherUserPhotoUrl).toBe('');
 expect(result.current.conversations[0].unreadCount).toBe(1);
 expect(mock.from).not.toHaveBeenCalled();expect(mock.channel).not.toHaveBeenCalled();
});
it('opens a matched chat using only its match id',async()=>{
 const {result}=renderHook(()=>useInboxData());await waitFor(()=>expect(result.current.loading).toBe(false));
 mock.rpc.mockResolvedValueOnce({data:'chat',error:null});
 await act(async()=>expect(await result.current.createConversation('match')).toBe('chat'));
 expect(mock.rpc).toHaveBeenCalledWith('open_own_match_chat',{target_match_id:'match'});
 expect(mock.from).not.toHaveBeenCalled();
});
