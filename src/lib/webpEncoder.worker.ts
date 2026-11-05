import encode, { init } from '@jsquash/webp/encode.js';
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';

self.onmessage = async event => {
  try {
    await init({ locateFile: (path: string) => path.includes('simd') ? simdWasmUrl : wasmUrl });
    const { pixels, width, height, quality } = event.data;
    const buffer = await encode(new ImageData(pixels, width, height), { quality: quality * 100 });
    self.postMessage({ buffer }, { transfer: [buffer] });
  } catch {
    self.postMessage({ error: 'encoding_failed' });
  }
};
