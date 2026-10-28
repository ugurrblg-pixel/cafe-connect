// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { afterEach, expect, it } from 'vitest';
import { discoverPreviewDocument } from '@/previews/discoverDocument';
const html=readFileSync(new URL('../previews/discover.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../previews/discover-demo.js',import.meta.url),'utf8');
const windows:JSDOM[]=[];
function open(){
 const dom=new JSDOM(discoverPreviewDocument(html,'html { color-scheme:dark }',script,'https://app.test','test-nonce'),{runScripts:'dangerously',url:'https://preview.test',virtualConsole:new VirtualConsole()});windows.push(dom);return dom;
}
afterEach(()=>{for(const dom of windows.splice(0))dom.window.close();});
it('renders the new light design and opens filters from both entry points',()=>{
 const dom=open(),d=dom.window.document;
 expect(d.documentElement.classList.contains('light')).toBe(true);
 expect(dom.window.getComputedStyle(d.body).backgroundColor).toBe('rgb(248, 247, 244)');
 const dialog=d.querySelector<HTMLDialogElement>('#preview-filters')!;
 dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');
 const entries=d.querySelectorAll<HTMLElement>('[data-preview-filters]');expect(entries).toHaveLength(2);
 for(const entry of entries){entry.click();expect(dialog.hasAttribute('open')).toBe(true);(dialog.querySelector('button') as HTMLElement).click();expect(dialog.hasAttribute('open')).toBe(false);}
});
it('removes uploaded executable scripts and permits only the owned demo script',()=>{
 const extra=html.replace('</body>','<script>window.stolen = true</script></body>');
 const output=discoverPreviewDocument(extra,'',script,'https://app.test','test-nonce');
 const dom=new JSDOM(output);windows.push(dom);const scripts=dom.window.document.querySelectorAll('script');
 expect(scripts).toHaveLength(1);expect(scripts[0].getAttribute('nonce')).toBe('test-nonce');expect(output).not.toContain('window.stolen');expect(output).not.toContain('cdn.tailwindcss.com');expect(output).not.toContain('Giriş Yapıldı!');
 expect(dom.window.document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("connect-src 'none'");
 expect(dom.window.document.querySelector('meta[name="viewport"]')?.getAttribute('content')).not.toContain('user-scalable=no');
});
it('filters actual example cards and restores them with the all filter',()=>{
 const {document}=open().window;
 (document.querySelector('[data-preview-category="gym"]') as HTMLElement).click();
 const visible=()=>[...document.querySelectorAll<HTMLElement>('[data-preview-venue]')].filter(card=>!card.hidden);
 expect(visible().map(c=>c.dataset.previewVenue)).toEqual(['gym']);
 expect(document.querySelector('[data-preview-category="gym"]')?.getAttribute('aria-pressed')).toBe('true');
 (document.querySelector('[data-preview-category="all"]') as HTMLElement).click();expect(visible()).toHaveLength(3);
});
it('sorts the examples by their displayed attendance counts and updates the radius label',()=>{
 const dom=open(),d=dom.window.document;
 const sort=d.querySelector<HTMLSelectElement>('#preview-sort')!;sort.value='active';sort.dispatchEvent(new dom.window.Event('change'));
 expect(d.querySelector('[data-preview-venue]')?.getAttribute('data-preview-venue')).toBe('bar');
 const radius=d.querySelector<HTMLSelectElement>('#preview-radius')!;radius.value='2000';radius.dispatchEvent(new dom.window.Event('change'));
 expect(d.querySelector('[data-preview-radius-label]')?.textContent).toContain('2 km');
});
it('never claims a real check-in or modifies the account through sample actions',()=>{
 const d=open().window.document;
 (d.querySelector('[data-preview-checkin]') as HTMLElement).click();expect(d.querySelector('#preview-notice')?.textContent).toContain('check-in kaydı oluşturulmadı');
 (d.querySelector('nav a[data-path="profil"]') as HTMLElement).click();expect(d.querySelector('#preview-notice')?.textContent).toContain('hesabın değişmez');
});
