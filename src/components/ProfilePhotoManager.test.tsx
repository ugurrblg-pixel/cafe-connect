import { fireEvent, render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProfilePhotoManager } from './ProfilePhotoManager';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), rpc: vi.fn(), refresh: vi.fn(), error: vi.fn(), review: vi.fn(), remove: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '11111111-1111-4111-8111-111111111111' }, refreshProfile: mocks.refresh }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, functions: { invoke: mocks.review }, storage: { from: () => ({
  upload: mocks.upload, remove: mocks.remove, list: async () => ({ data: [], error: null }),
}) } } }));
vi.mock('@/lib/privatePhotos', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/privatePhotos')>()), prepareProfilePhoto: async () => new Blob(['image'], {type: 'image/webp'}) }));
vi.mock('./PrivateProfileImage', () => ({ PrivateProfileImage: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: mocks.error } }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_PHOTO_REVIEW_ENABLED','false'); mocks.remove.mockResolvedValue({data:[],error:null}); mocks.refresh.mockResolvedValue(undefined); mocks.upload.mockResolvedValue({ error: null }); mocks.rpc.mockResolvedValue({ error: null }); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
it('saves the first private photo when the new account has an external OAuth avatar', async () => {
  const changed = vi.fn();
  const view = render(<ProfilePhotoManager photos={['https://example.com/oauth-avatar.jpg']} onPhotosChange={changed} />);
  fireEvent.change(view.container.querySelector('input')!, { target: { files: [new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => expect(changed).toHaveBeenCalled());
  const paths = mocks.rpc.mock.calls[0][1].object_paths;
  expect(paths).toHaveLength(1);
  expect(paths[0]).toMatch(/^11111111-1111-4111-8111-111111111111\/.*\.webp$/);
  expect(mocks.error).not.toHaveBeenCalled();
});
it('shows the actual storage failure and does not save an unavailable upload', async () => {
  mocks.upload.mockResolvedValue({ error: { message: 'Storage temporarily unavailable' } });
  const view = render(<ProfilePhotoManager photos={[]} onPhotosChange={vi.fn()} />);
  fireEvent.change(view.container.querySelector('input')!, { target: { files: [new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Storage temporarily unavailable'));
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('does not transmit a photo without explicit review consent', async () => {
  vi.stubEnv('VITE_PHOTO_REVIEW_ENABLED','true');
  const view = render(<ProfilePhotoManager photos={[]} onPhotosChange={vi.fn()} />);
  fireEvent.change(view.container.querySelector('input[type=file]')!, {target:{files:[new File(['jpg'],'test.jpg',{type:'image/jpeg'})]}});
  expect(mocks.upload).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
});
it.each(['rejected','pending'])('does not save a %s photo and rolls back only the new upload', async status => {
  vi.stubEnv('VITE_PHOTO_REVIEW_ENABLED','true');
  mocks.review.mockResolvedValue({data:{status},error:null});
  const view = render(<ProfilePhotoManager photos={[]} onPhotosChange={vi.fn()} />);
  fireEvent.click(view.container.querySelector('input[type=checkbox]')!);
  fireEvent.change(view.container.querySelector('input[type=file]')!, {target:{files:[new File(['jpg'],'test.jpg',{type:'image/jpeg'})]}});
  await waitFor(() => expect(mocks.remove).toHaveBeenCalled());
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.remove.mock.calls[0][0]).toEqual([mocks.upload.mock.calls[0][0]]);
});
it('saves an accepted photo only after content review', async () => {
  vi.stubEnv('VITE_PHOTO_REVIEW_ENABLED','true');
  mocks.review.mockResolvedValue({data:{status:'accepted'},error:null});
  const changed=vi.fn(); const view=render(<ProfilePhotoManager photos={[]} onPhotosChange={changed} />);
  fireEvent.click(view.container.querySelector('input[type=checkbox]')!);
  fireEvent.change(view.container.querySelector('input[type=file]')!, {target:{files:[new File(['jpg'],'test.jpg',{type:'image/jpeg'})]}});
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(mocks.review.mock.calls[0][1].body.reviewConsent).toBe(true);
  expect(mocks.remove).not.toHaveBeenCalled();
});
