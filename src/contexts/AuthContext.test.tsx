import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mock = vi.hoisted(() => ({ listener: null as any, session: null as any, queries: [] as any[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    onAuthStateChange: vi.fn((callback) => { mock.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
    getSession: vi.fn(() => Promise.resolve({ data: { session: mock.session } })),
    signOut: vi.fn(() => Promise.resolve()),
  },
  from: () => ({ select: () => ({ eq: (_column: string, userId: string) => ({
    maybeSingle: () => new Promise(resolve => mock.queries.push({ userId, resolve })),
  }) }) }),
} }));

const session = (id: string) => ({ user: { id } });
const resolveProfile = (query: any, name: string) => query.resolve({ data: { display_name: name }, error: null });
function Probe() {
  const { user, profile, loading } = useAuth();
  return <div data-testid="state">{user?.id ?? 'none'}|{profile?.display_name ?? 'none'}|{String(loading)}</div>;
}
beforeEach(() => { mock.session = null; mock.queries = []; });
afterEach(cleanup);

describe('profile responses across auth transitions', () => {
  it('does not restore a profile after sign-out', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => mock.listener('SIGNED_IN', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(1));
    act(() => mock.listener('SIGNED_OUT', null));
    await act(async () => resolveProfile(mock.queries[0], 'Old profile'));
    expect(screen.getByTestId('state').textContent).toBe('none|none|false');
  });

  it('ignores the previous account response when switching accounts', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => mock.listener('SIGNED_IN', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(1));
    act(() => mock.listener('SIGNED_IN', session('second')));
    await waitFor(() => expect(mock.queries).toHaveLength(2));
    await act(async () => resolveProfile(mock.queries[1], 'Current profile'));
    await act(async () => resolveProfile(mock.queries[0], 'Old profile'));
    expect(screen.getByTestId('state').textContent).toBe('second|Current profile|false');
  });
});
