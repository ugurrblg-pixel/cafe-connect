import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useState } from 'react';
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
function PageStateProbe() {
  const { loading } = useAuth();
  return loading ? <span>Açılış ekranı</span> : <PageForm />;
}
function PageForm() {
  const [value, setValue] = useState('');
  return <input aria-label="Taslak" value={value} onChange={event => setValue(event.target.value)} />;
}
beforeEach(() => { mock.session = null; mock.queries = []; });
afterEach(cleanup);

describe('profile responses across auth transitions', () => {
  it('preserves page state and avoids new profile reads on focus sign-in and token refresh', async () => {
    render(<AuthProvider><Probe /><PageStateProbe /></AuthProvider>);
    act(() => mock.listener('SIGNED_IN', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(1));
    await act(async () => resolveProfile(mock.queries[0], 'Current profile'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Taslak' }), { target: { value: 'Yarım kalan mesaj' } });
    act(() => mock.listener('SIGNED_IN', session('first')));
    act(() => mock.listener('TOKEN_REFRESHED', session('first')));
    expect(screen.getByTestId('state')).toHaveTextContent('first|Current profile|false');
    expect(screen.getByRole('textbox', { name: 'Taslak' })).toHaveValue('Yarım kalan mesaj');
    expect(mock.queries).toHaveLength(1);
  });

  it('keeps the initial loading gate until a profile is resolved despite repeated auth events', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => mock.listener('SIGNED_IN', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(1));
    act(() => mock.listener('TOKEN_REFRESHED', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(2));
    await act(async () => resolveProfile(mock.queries[0], 'Old response'));
    expect(screen.getByTestId('state')).toHaveTextContent('first|none|true');
    await act(async () => resolveProfile(mock.queries[1], 'Current profile'));
    expect(screen.getByTestId('state')).toHaveTextContent('first|Current profile|false');
  });

  it('refreshes USER_UPDATED in the background and blocks a real account switch', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => mock.listener('SIGNED_IN', session('first')));
    await waitFor(() => expect(mock.queries).toHaveLength(1));
    await act(async () => resolveProfile(mock.queries[0], 'Initial profile'));
    act(() => mock.listener('USER_UPDATED', session('first')));
    expect(screen.getByTestId('state')).toHaveTextContent('first|Initial profile|false');
    await waitFor(() => expect(mock.queries).toHaveLength(2));
    await act(async () => resolveProfile(mock.queries[1], 'Updated profile'));
    act(() => mock.listener('SIGNED_IN', session('second')));
    expect(screen.getByTestId('state')).toHaveTextContent('second|none|true');
  });
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
