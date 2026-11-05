// Runs only on browsers that cannot encode WebP natively. Pixels stay on-device.
export function encodeWebpFallback(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const context = canvas.getContext('2d');
    if (!context) { reject(new Error('Image context unavailable')); return; }
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const worker = new Worker(new URL('./webpEncoder.worker.ts', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Image encoding timed out')); }, 30000);
    worker.onerror = () => { finish(); reject(new Error('Image encoding failed')); };
    worker.onmessage = event => {
      finish();
      if (event.data?.buffer instanceof ArrayBuffer) resolve(new Blob([event.data.buffer], { type: 'image/webp' }));
      else reject(new Error('Image encoding failed'));
    };
    worker.postMessage({ pixels: image.data, width: image.width, height: image.height, quality }, [image.data.buffer]);
  });
}
