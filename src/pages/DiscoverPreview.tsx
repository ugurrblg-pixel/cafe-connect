import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html from '@/previews/discover.html?raw';
import css from '@/previews/discover-theme.css?inline';
import demoScript from '@/previews/discover-demo.js?raw';
import { discoverPreviewDocument } from '@/previews/discoverDocument';

export default function DiscoverPreview() {
  const navigate = useNavigate();
  const document = useMemo(() => discoverPreviewDocument(html, css, demoScript, window.location.origin, crypto.randomUUID()), []);
  return <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate('/')}><ArrowLeft aria-hidden="true"/>Ana keşfete dön</Button><strong className="text-sm">Tasarım denemesi</strong></div>
      <p className="text-xs text-muted-foreground">Örnek mekanlar ve sayılar · İşlemler kaydedilmez</p>
    </div>
    <iframe title="Yeni keşfet tasarımı — deneme" sandbox="allow-scripts" srcDoc={document} className="min-h-0 w-full flex-1 border-0 bg-[#F8F7F4]" />
  </div>;
}
