export function discoverPreviewDocument(html: string, css: string, demoScript: string, origin: string, nonce: string) {
  // Only the bundled, reviewed demo script executes. The original upload's scripts are removed.
  const sanitized = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const csp = `default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https://lh3.googleusercontent.com ${origin}; script-src 'nonce-${nonce}'; connect-src 'none'; form-action 'none'; base-uri 'none'`;
  return sanitized
    .replace('<html ', `<html data-asset-origin="${origin}" `)
    .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="robots" content="noindex,nofollow"><style>${css}</style>`)
    .replace('</body>', `<script nonce="${nonce}">${demoScript}</script></body>`);
}
