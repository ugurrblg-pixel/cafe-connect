import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import UserProfileView from './UserProfileView';

const mocks = vi.hoisted(() => ({
  useCafeUsers: vi.fn(),
  logProfileView: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer' } }) }));
vi.mock('@/hooks/useActiveCheckIn', () => ({
  useActiveCheckIn: () => ({ activeCheckIn: { cafeId: 'cafe' }, loading: false }),
}));
vi.mock('@/hooks/useCafeUsers', () => ({ useCafeUsers: mocks.useCafeUsers }));
vi.mock('@/hooks/useProfileViews', () => ({
  useProfileViews: () => ({ logProfileView: mocks.logProfileView }),
}));
vi.mock('@/components/Header', () => ({ Header: () => null }));
vi.mock('@/components/PurposeBadge', () => ({ PurposeBadge: () => null }));
vi.mock('@/components/ProfilePhotoCarousel', () => ({ ProfilePhotoCarousel: () => null }));

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile/sender']}>
      <Routes>
        <Route path="/profile/:userId" element={<UserProfileView />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

it('opens a sender profile using the current cafe member projection', () => {
  mocks.useCafeUsers.mockReturnValue({
    users: [{ userId: 'sender', displayName: 'Deniz', purpose: 'chat', hobbies: [] }],
    loading: false,
    connectionStatus: 'connected',
  });
  renderProfile();
  expect(screen.getByRole('heading', { name: 'Deniz' })).toBeInTheDocument();
  expect(mocks.useCafeUsers).toHaveBeenCalledWith('cafe', { isCheckedIn: true });
  expect(mocks.logProfileView).toHaveBeenCalledWith('sender', 'cafe');
});

it('keeps the profile hidden when the server omits the sender', () => {
  mocks.useCafeUsers.mockReturnValue({ users: [], loading: false, connectionStatus: 'connected' });
  renderProfile();
  expect(screen.getByRole('status')).toHaveTextContent('aynı mekânda aktif check-in');
  expect(mocks.logProfileView).not.toHaveBeenCalled();
});
