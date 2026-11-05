// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

const source = readFileSync('public/sw.js', 'utf8');
type Event = {
  request: { method: string; mode: string; url: string };
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (result: Promise<unknown>) => void;
  data: { json: () => unknown };
  notification: { close: () => void; data: { url: string } };
};
function harness() {
  const listeners: Record<string, (event: Partial<Event>) => void> = {};
  const cache = { addAll: vi.fn(async () => undefined), match: vi.fn(async () => new Response('offline-page')) };
  const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ['riyo-public-shell-v0', 'other-app']), delete: vi.fn(async () => true) };
  const network = vi.fn(async () => new Response('network'));
  const showNotification = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => undefined);
  const self = {
    location: { origin: 'https://www.riyosocial.app' },
    addEventListener: (name: string, handler: (event: Partial<Event>) => void) => { listeners[name] = handler; },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined), matchAll: vi.fn(async () => []), openWindow },
    registration: { showNotification },
  };
  new Function('self', 'caches', 'fetch', 'URL', 'Response', source)(self, caches, network, URL, Response);
  const navigate = async () => {
    let response: Promise<Response> | undefined;
    listeners.fetch({ request: { method: 'GET', mode: 'navigate', url: self.location.origin + '/messages' }, respondWith: value => { response = value; } });
    return response!;
  };
  return { listeners, cache, caches, network, navigate, showNotification, openWindow };
}

it('preloads only the public offline document and icons', async () => {
  const h = harness(); let pending: Promise<unknown> | undefined;
  h.listeners.install({ waitUntil: value => { pending = value; } }); await pending;
  const paths = h.cache.addAll.mock.calls[0] as unknown as [string[]];
  expect(paths[0]).toContain('/offline.html');
  expect(paths[0].every(path => path === '/offline.html' || path.startsWith('/icons/'))).toBe(true);
});
it('returns navigation responses without storing authenticated content', async () => {
  const h = harness(); expect(await (await h.navigate()).text()).toBe('network');
  expect(h.caches.open).not.toHaveBeenCalled();
});
it('uses the generic offline document only on a failed navigation network request', async () => {
  const h = harness(); h.network.mockRejectedValueOnce(new TypeError('offline'));
  expect(await (await h.navigate()).text()).toBe('offline-page');
  expect(h.cache.match).toHaveBeenCalledWith('/offline.html');
});
it('preserves server failures instead of displaying an offline success', async () => {
  const h = harness(); h.network.mockResolvedValueOnce(new Response('error', { status: 500 }));
  expect((await h.navigate()).status).toBe(500); expect(h.caches.open).not.toHaveBeenCalled();
});
it('does not intercept APIs, mutations or private images', () => {
  const h = harness(); const respondWith = vi.fn();
  for (const request of [
    { method: 'POST', mode: 'cors', url: 'https://www.riyosocial.app/api' },
    { method: 'GET', mode: 'cors', url: 'https://xbodyzqtltrdtdahrteh.supabase.co/rest/v1/profiles' },
    { method: 'GET', mode: 'cors', url: 'https://www.riyosocial.app/private-photo.webp' },
  ]) h.listeners.fetch({ request, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
});
it('does not put private push text on the lock screen or open external notification targets', async () => {
  const h = harness(); let pending: Promise<unknown> | undefined;
  h.listeners.push({ data: { json: () => ({ body: 'Private message', data: { url: 'https://untrusted.example/' } }) }, waitUntil: p => { pending = p; } }); await pending;
  expect(h.showNotification).toHaveBeenCalledWith('Riyo', expect.objectContaining({ body: 'Riyo’da yeni bir bildirimin var.', data: { url: 'https://www.riyosocial.app/notifications' } }));
  h.listeners.notificationclick({ notification: { close: vi.fn(), data: { url: '//untrusted.example/' } }, waitUntil: p => { pending = p; } }); await pending;
  expect(h.openWindow).toHaveBeenCalledWith('https://www.riyosocial.app/notifications');
});
it('cleans up only its own obsolete cache versions', async () => {
  const h = harness(); let pending: Promise<unknown> | undefined;
  h.listeners.activate({ waitUntil: p => { pending = p; } }); await pending;
  expect(h.caches.delete).toHaveBeenCalledTimes(1); expect(h.caches.delete).toHaveBeenCalledWith('riyo-public-shell-v0');
});
