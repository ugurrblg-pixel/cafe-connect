import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWaves } from './useWaves';
const mock=vi.hoisted(()=>({user:{id:'viewer'} as any,rpc:vi.fn(),from:vi.fn(),channel:vi.fn(),error:vi.fn(),info:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,from:mock.from,channel:mock.channel}}));
vi.mock('sonner',()=>({toast:{error:mock.error,info:mock.info}}));
beforeEach(()=>{vi.clearAllMocks();mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:[],error:null});mock.user={id:'viewer'};vi.stubEnv('VITE_CAFE_WAVES_ENABLED','true');});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('sends only a target and cafe to the server and trusts its match result',async()=>{
 const {result}=renderHook(()=>useWaves());await waitFor(()=>expect(result.current.loading).toBe(false));
 mock.rpc.mockResolvedValueOnce({data:{is_match:true,match_id:'match'},error:null});
 await act(async()=>expect(await result.current.sendWave('peer','cafe')).toEqual({success:true,isMatch:true}));
 expect(mock.rpc).toHaveBeenCalledWith('send_own_wave',{target_user_id:'peer',target_cafe_id:'cafe'});
 expect(mock.from).not.toHaveBeenCalled();expect(mock.channel).not.toHaveBeenCalled();
});
it('reports server quota rejection without claiming a match',async()=>{
 const {result}=renderHook(()=>useWaves());await waitFor(()=>expect(result.current.loading).toBe(false));
 mock.rpc.mockResolvedValueOnce({error:{message:'Daily wave limit reached'}});
 await act(async()=>expect(await result.current.sendWave('peer','cafe')).toEqual({success:false}));
 expect(mock.error).toHaveBeenCalledWith('Günlük 3 selam sınırına ulaştın.');
});
it('does not query or send until explicitly enabled',async()=>{
 vi.stubEnv('VITE_CAFE_WAVES_ENABLED','false');
 const {result}=renderHook(()=>useWaves());await waitFor(()=>expect(result.current.loading).toBe(false));
 await act(async()=>expect(await result.current.sendWave('peer','cafe')).toEqual({success:false}));
 expect(mock.rpc).not.toHaveBeenCalled();
});
it('discards an old account response after sign-out',async()=>{
 let resolve:(value:any)=>void;
 mock.rpc.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 const {result,rerender}=renderHook(()=>useWaves());mock.user=null;rerender();
 await act(async()=>resolve({data:[{id:'wave',from_user_id:'peer',to_user_id:'viewer',cafe_id:'cafe',created_at:'2026-10-09T10:00:00Z',display_name:'Old peer'}],error:null}));
 expect(result.current.incomingWaves).toEqual([]);expect(result.current.sentWaves).toEqual([]);
});
