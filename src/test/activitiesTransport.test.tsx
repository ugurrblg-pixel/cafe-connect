import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
const mock=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'test-viewer'}})}));
vi.mock('@/integrations/supabase/client',async()=>{
 const {createClient}=await import('@supabase/supabase-js');
 return {supabase:createClient('https://test.invalid','test-only-public-key',{
  global:{fetch:mock.fetch},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 })};
});
import { activityRpc } from '@/lib/activities';
import { useActivitiesAvailability } from '@/hooks/useActivitiesAvailability';
beforeEach(()=>{mock.fetch.mockReset().mockImplementation(async()=>new Response(JSON.stringify(true),{headers:{'Content-Type':'application/json'}}));});
function setup(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return renderHook(()=>useActivitiesAvailability(),{wrapper:({children})=><QueryClientProvider client={client}>{children}</QueryClientProvider>});}
it('uses the real SDK receiver for activity RPCs, including mutation arguments',async()=>{
 expect(await activityRpc('manage_social_activity',z.boolean(),{target:'test',action:'request'})).toBe(true);
 expect(mock.fetch).toHaveBeenCalledOnce();const [url,options]=mock.fetch.mock.calls[0];expect(String(url)).toContain('/rest/v1/rpc/manage_social_activity');expect(JSON.parse(options.body)).toEqual({target:'test',action:'request'});
});
it('shows enabled activity availability through the real SDK request path',async()=>{
 const {result}=setup();await waitFor(()=>expect(result.current.data).toBe(true));expect(result.current.isError).toBe(false);expect(String(mock.fetch.mock.calls[0][0])).toContain('/rest/v1/rpc/social_activities_available');
});
it('keeps a disabled feature closed rather than inventing enabled state',async()=>{
 mock.fetch.mockImplementation(async()=>new Response('false',{headers:{'Content-Type':'application/json'}}));const {result}=setup();await waitFor(()=>expect(result.current.data).toBe(false));expect(result.current.isError).toBe(false);
});
it('does not treat a denied or failed backend request as enabled',async()=>{
 mock.fetch.mockImplementation(async()=>new Response(JSON.stringify({message:'permission denied',code:'42501'}),{status:403,headers:{'Content-Type':'application/json'}}));const {result}=setup();await waitFor(()=>expect(result.current.isError).toBe(true));expect(result.current.data).not.toBe(true);
});
