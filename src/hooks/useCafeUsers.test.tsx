import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCafeUsers } from './useCafeUsers';

const mock = vi.hoisted(() => ({ user: { id: 'viewer' } as any, pending: [] as any[], channel: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  channel: mock.channel,
  from: mock.from,
  rpc: mock.rpc,
} }));
beforeEach(() => {
  mock.user = { id: 'viewer' }; mock.pending = []; mock.channel.mockClear(); mock.from.mockReset();
  mock.rpc.mockReset();mock.rpc.mockImplementation(()=>new Promise(resolve=>mock.pending.push(resolve))); vi.stubEnv('VITE_CAFE_MEMBER_LIST_ENABLED', 'true');vi.stubEnv('VITE_CAFE_PHOTOS_ENABLED','false');
  mock.from.mockImplementation((table: string) => ({ select: () => table === 'check_ins'
    ? { eq: () => ({ gt: () => new Promise(resolve => mock.pending.push(resolve)) }) }
    : { in: () => Promise.resolve({ data: [], error: null }) },
  }));
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe('server-authorized cafe list', () => {
  it('uses the restricted projection without profile or photo reads when enabled', async () => {
    vi.stubEnv('VITE_CAFE_MEMBER_LIST_ENABLED', 'true');
    mock.rpc.mockResolvedValue({ data: [{ id: 'profile', user_id: 'peer', display_name: 'Peer',
      age: 25, bio: 'Hello', purpose: 'friendship', allow_dms: true, is_verified: false,
      hobbies: [], check_in_time: '2026-10-09T10:00:00Z', last_active_at: '2026-10-09T10:00:00Z' }], error: null });
    const { result } = renderHook(() => useCafeUsers('cafe', { isCheckedIn: true }));
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(mock.rpc).toHaveBeenCalledWith('list_current_cafe_members', { target_cafe_id: 'cafe' });
    expect(mock.from).not.toHaveBeenCalled();
    expect(result.current.users[0].photoUrl).toBe('');
    expect(result.current.users[0].photoUrls).toEqual([]);
  });
  it('does not fall back to broad table queries if the projection fails', async () => {
    vi.stubEnv('VITE_CAFE_MEMBER_LIST_ENABLED', 'true');
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const { result } = renderHook(() => useCafeUsers('cafe', { isCheckedIn: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
    expect(result.current.connectionStatus).toBe('disconnected');
  });
  it('does not join or broadcast on a public channel', async () => {
    const { result } = renderHook(() => useCafeUsers('cafe', { isCheckedIn: true }));
    await act(async () => mock.pending[0]({ data: [], error: null }));
    expect(result.current.connectionStatus).toBe('connected');
    expect(mock.channel).not.toHaveBeenCalled();
  });
  it('does not query when checked out', async () => {
    const { result } = renderHook(() => useCafeUsers('cafe', { isCheckedIn: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mock.from).not.toHaveBeenCalled();
    expect(result.current.users).toEqual([]);
  });
  it('ignores a response from the previous cafe', async () => {
    const { result, rerender } = renderHook(({ cafe }) => useCafeUsers(cafe, { isCheckedIn: true }), { initialProps: { cafe: 'first' } });
    rerender({ cafe: 'second' });
    await act(async () => mock.pending[1]({ data: [], error: null }));
    await act(async () => mock.pending[0]({ data: [{ user_id: 'old' }], error: null }));
    expect(result.current.users).toEqual([]);
    expect(mock.rpc).toHaveBeenCalledTimes(2);expect(mock.from).not.toHaveBeenCalled();
  });
  it('clears the list and connection state on a failed request', async () => {
    const { result } = renderHook(() => useCafeUsers('cafe', { isCheckedIn: true }));
    await act(async () => mock.pending[0]({ data: null, error: { message: 'denied' } }));
    expect(result.current.users).toEqual([]);
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.loading).toBe(false);
  });
});
