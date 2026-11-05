import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { prepareProfilePhoto } from './privatePhotos';

const fallback = vi.hoisted(() => vi.fn());
vi.mock('./webpFallback', () => ({ encodeWebpFallback: fallback }));
let toBlob: ReturnType<typeof vi.fn<HTMLCanvasElement['toBlob']>>;
let decode: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
let canvas: HTMLCanvasElement;
const image = new File(['synthetic'], 'photo.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  fallback.mockReset();
  decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('Image', class { width = 4000; height = 3000; decode = decode; src = ''; });
  revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: revoke });
  canvas = document.createElement('canvas');
  toBlob = vi.fn(callback => callback(new Blob(['webp'], { type: 'image/webp' })));
  vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  canvas.toBlob = toBlob;
  vi.spyOn(document, 'createElement').mockReturnValue(canvas);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('prepares the image locally at a bounded resolution and releases the source', async () => {
  expect((await prepareProfilePhoto(image)).type).toBe('image/webp');
  expect(canvas.width).toBe(2048);
  expect(canvas.height).toBe(1536);
  expect(fallback).not.toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith('blob:synthetic');
});
it('uses the local encoder when Safari returns PNG instead of WebP', async () => {
  toBlob.mockImplementation(callback => callback(new Blob(['png'], { type: 'image/png' })));
  fallback.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
  expect((await prepareProfilePhoto(image)).type).toBe('image/webp');
  expect(fallback).toHaveBeenCalledOnce();
});
it('recovers when native canvas encoding returns null', async () => {
  toBlob.mockImplementation(callback => callback(null));
  fallback.mockResolvedValue(new Blob(['webp'], { type: 'image/webp' }));
  expect((await prepareProfilePhoto(image)).size).toBeGreaterThan(0);
});
it('reduces resolution and quality when the first result exceeds the storage limit', async () => {
  toBlob.mockImplementationOnce(callback => callback(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/webp' })));
  await prepareProfilePhoto(image);
  expect(canvas.width).toBe(1600);
  expect(toBlob).toHaveBeenCalledTimes(2);
});
it('rejects undecodable files and always releases their object URL', async () => {
  decode.mockRejectedValue(new Error('invalid image'));
  await expect(prepareProfilePhoto(image)).rejects.toThrow('okunamadı');
  expect(revoke).toHaveBeenCalledOnce();
});
it('does not return an invalid or empty result when both encoders fail', async () => {
  toBlob.mockImplementation(callback => callback(null));
  fallback.mockRejectedValue(new Error('unavailable'));
  await expect(prepareProfilePhoto(image)).rejects.toThrow('bu cihazda');
  expect(revoke).toHaveBeenCalledOnce();
});
