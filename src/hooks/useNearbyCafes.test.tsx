import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNearbyCafes } from './useNearbyCafes';
const mock=vi.hoisted(()=>({user:{id:'search-user'} as any,invoke:vi.fn(),index:0,saved:[] as any[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke},from:()=>{
 const chain={select:()=>chain,gte:()=>chain,lte:()=>chain,limit:async()=>({data:mock.saved,error:null})};return chain;
}}}));
const coords={latitude:41,longitude:29};
const success={data:{cafes:[{id:'cafe',name:'Cafe',latitude:41,longitude:29}],source:'google_places',radius:1000},error:null};
beforeEach(()=>{mock.user={id:`search-test-${++mock.index}`};mock.saved=[];mock.invoke.mockReset();mock.invoke.mockResolvedValue(success);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('coalesces concurrent searches and reuses the successful result',async()=>{
 let resolve:(value:any)=>void;mock.invoke.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 const {result}=renderHook(()=>useNearbyCafes());
 await act(async()=>{void result.current.fetchNearbyCafes(coords);await result.current.fetchNearbyCafes(coords);});
 expect(mock.invoke).toHaveBeenCalledTimes(1);
 await act(async()=>resolve(success));
 await act(async()=>result.current.fetchNearbyCafes(coords));
 expect(mock.invoke).toHaveBeenCalledTimes(1);expect(result.current.cafes).toHaveLength(1);expect(result.current.error).toBeNull();
});
it('reuses the account cache after returning to the page',async()=>{
 const first=renderHook(()=>useNearbyCafes());await act(async()=>first.result.current.fetchNearbyCafes(coords));first.unmount();
 const second=renderHook(()=>useNearbyCafes());await act(async()=>second.result.current.fetchNearbyCafes(coords));
 expect(mock.invoke).toHaveBeenCalledTimes(1);expect(second.result.current.cafes).toHaveLength(1);
});
it('keeps the quota error steady without retrying immediately',async()=>{
 mock.invoke.mockResolvedValueOnce({data:null,error:{context:new Response(JSON.stringify({error:'quota'}),{status:429,headers:{'Retry-After':'60'}})}});
 const {result}=renderHook(()=>useNearbyCafes());await act(async()=>result.current.fetchNearbyCafes(coords));
 const message=result.current.error;
 await act(async()=>result.current.fetchNearbyCafes(coords));
 expect(mock.invoke).toHaveBeenCalledTimes(1);expect(result.current.error).toBe(message);expect(message).toContain('Arama sınırına');
});
it('shows previously saved nearby cafes when Google lookup quota is exhausted',async()=>{
 mock.saved=[{id:'saved-cafe',name:'Saved',latitude:41,longitude:29,is_open:true}];
 mock.invoke.mockResolvedValueOnce({data:null,error:{context:new Response('{}',{status:429})}});
 const {result}=renderHook(()=>useNearbyCafes());await act(async()=>result.current.fetchNearbyCafes(coords));
 expect(result.current.error).toBeNull();expect(result.current.source).toBe('cache_fallback');expect(result.current.cafes[0].id).toBe('saved-cafe');
 await act(async()=>result.current.fetchNearbyCafes(coords));expect(mock.invoke).toHaveBeenCalledTimes(1);
});
