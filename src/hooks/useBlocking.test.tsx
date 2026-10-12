import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useBlocking } from './useBlocking';
const mock = vi.hoisted(() => ({ user: { id: 'viewer' } as any, rpc: vi.fn(), from: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));
vi.mock('sonner', () => ({ toast: { success: mock.success, warning: mock.warning, error: mock.error } }));
beforeEach(() => { mock.user = { id: 'viewer' }; vi.clearAllMocks(); mock.rpc.mockReset(); mock.rpc.mockResolvedValue({ data: [], error: null }); });
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('does not send reports before server activation',async()=>{
 vi.stubEnv('VITE_REPORTS_ENABLED','false');
 const {result}=renderHook(()=>useBlocking());
 await waitFor(()=>expect(result.current.listLoading).toBe(false));
 mock.rpc.mockClear();
 await act(async()=>expect(await result.current.reportUser('peer','spam')).toBe(false));
 expect(mock.rpc).not.toHaveBeenCalled();
 expect(mock.from).not.toHaveBeenCalled();
});
it('uses a caller-bound report RPC and requires a saved receipt',async()=>{
 vi.stubEnv('VITE_REPORTS_ENABLED','true');
 const {result}=renderHook(()=>useBlocking());
 await waitFor(()=>expect(result.current.listLoading).toBe(false));
 mock.rpc.mockResolvedValueOnce({data:'receipt',error:null});
 await act(async()=>expect(await result.current.reportUser('peer','harassment',' detail ')).toBe(true));
 expect(mock.rpc).toHaveBeenCalledWith('submit_own_report',{target_user_id:'peer',report_reason:'harassment',report_description:'detail'});
 expect(mock.from).not.toHaveBeenCalled();
 mock.success.mockClear();mock.rpc.mockResolvedValueOnce({data:null,error:{message:'denied'}});
 await act(async()=>expect(await result.current.reportUser('peer','spam')).toBe(false));
 expect(mock.success).not.toHaveBeenCalled();
});
it('blocks through a caller-bound RPC and uses the saved list', async () => {
  const { result } = renderHook(() => useBlocking());
  await waitFor(() => expect(result.current.listLoading).toBe(false));
  mock.rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ data: [{ id: 'saved-id', blocked_id: 'peer', created_at: '2026-10-09T10:00:00Z' }], error: null });
  await act(async () => expect(await result.current.blockUser('peer')).toBe(true));
  expect(mock.rpc).toHaveBeenCalledWith('set_own_block', { target_user_id: 'peer', blocked: true });
  expect(result.current.blockedUsers[0].id).toBe('saved-id');
  expect(mock.from).not.toHaveBeenCalled();
});
it('does not show success or add a fake block after server rejection', async () => {
  const { result } = renderHook(() => useBlocking());
  await waitFor(() => expect(result.current.listLoading).toBe(false));
  mock.rpc.mockResolvedValueOnce({ error: { message: 'denied' } });
  await act(async () => expect(await result.current.blockUser('peer')).toBe(false));
  expect(mock.success).not.toHaveBeenCalled();
  expect(result.current.blockedUsers).toEqual([]);
});
it('reports a saved mutation separately from a failed list refresh', async () => {
  const { result } = renderHook(() => useBlocking());
  await waitFor(() => expect(result.current.listLoading).toBe(false));
  mock.rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'network' } });
  await act(async () => expect(await result.current.blockUser('peer')).toBe(true));
  expect(mock.warning).toHaveBeenCalledOnce();
  expect(result.current.listError).toBe(true);
});
it('ignores old account list responses after sign-out', async () => {
  let resolve: (value: any) => void;
  mock.rpc.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { result, rerender } = renderHook(() => useBlocking());
  mock.user = null; rerender();
  await act(async () => resolve({ data: [{ id: 'old', blocked_id: 'peer', created_at: '2026-10-09T10:00:00Z' }], error: null }));
  expect(result.current.blockedUsers).toEqual([]);
  expect(result.current.listLoading).toBe(false);
});
