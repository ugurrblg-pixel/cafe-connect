# Photo preparation recovery

The reported “Fotoğraf hazırlanamadı” error occurs before Storage upload or moderation. The previous helper required one native canvas WebP encoding at 2048px/quality 0.9. A null result, another MIME type (including Safari's PNG fallback), or a result exceeding 5MB stopped the upload. The exact reporting device has not been identified.

Preparation now tries 2048/1600/1200px with decreasing quality. Browsers without native WebP encoding use the bundled jSquash encoder in a disposable worker, with a 30-second timeout. Both WASM variants are served from the app's own assets; no photo is sent to a conversion service. Source metadata is discarded by pixel re-encoding. Empty, invalid and oversized output remains rejected. Existing private WebP paths, Storage limits, review consent, moderation and profile access rules are unchanged. The shared helper also serves verification selfies.

Validation: 12 targeted preparation/upload tests passed; Vite production build passed. The actual built worker encoded a synthetic 16x16 image into an 80-byte WebP in the browser, which decoded successfully. An owner upload on the affected device is still needed to confirm the reported incident end to end.
