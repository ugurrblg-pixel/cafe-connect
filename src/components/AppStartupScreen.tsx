import { useEffect, useState } from "react";
import { Radar, Radio, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./AppStartupScreen.css";

/** Real auth startup state; this illustration never requests location or Places. */
export function AppStartupScreen() {
  const [slow, setSlow] = useState(false);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10_000);
    const updateConnection = () => setOffline(!navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const status = offline
    ? "İnternet bağlantısı bekleniyor"
    : slow
      ? "Açılış beklenenden uzun sürüyor"
      : "Oturumun hazırlanıyor";

  return (
    <main className="riyo-startup" aria-label="Riyo açılış ekranı">
      <div className="riyo-startup__layout">
        <header className="riyo-startup__header">
          <span className="riyo-startup__pill">
            <span className="riyo-startup__dot" aria-hidden="true" />
            RİYO · SOSYAL RADAR
          </span>
          <span className="riyo-startup__pill riyo-startup__pill--quiet">
            <Radar size={15} aria-hidden="true" />
            AÇILIYOR
          </span>
        </header>

        <div className="riyo-startup__center">
          <div className="riyo-startup__radar" aria-hidden="true">
            <div className="riyo-startup__wave riyo-startup__wave--one" />
            <div className="riyo-startup__wave riyo-startup__wave--two" />
            <div className="riyo-startup__wave riyo-startup__wave--three" />
            <svg className="riyo-startup__grid" viewBox="0 0 340 340" fill="none">
              <circle cx="170" cy="170" r="162" stroke="currentColor" strokeDasharray="4 6" />
              <circle cx="170" cy="170" r="124" className="riyo-startup__inner-ring" />
              <circle cx="170" cy="170" r="88" stroke="currentColor" strokeDasharray="3 5" />
              <path d="M170 8V332M8 170H332" stroke="currentColor" strokeDasharray="4 4" opacity=".4" />
              <g fill="currentColor">
                <circle cx="170" cy="8" r="2.5" /><circle cx="332" cy="170" r="2.5" />
                <circle cx="170" cy="332" r="2.5" /><circle cx="8" cy="170" r="2.5" />
              </g>
            </svg>
            <div className="riyo-startup__sweep" />
            <span className="riyo-startup__blip riyo-startup__blip--pink"><i />Keşfet</span>
            <span className="riyo-startup__blip riyo-startup__blip--cyan"><i />Tanış</span>
            <span className="riyo-startup__spark riyo-startup__spark--amber" />
            <span className="riyo-startup__spark riyo-startup__spark--violet" />
            <div className="riyo-startup__core">
              <span className="riyo-startup__symbol"><Radio size={28} strokeWidth={1.5} /></span>
              <span className="riyo-startup__wordmark">Riyo</span>
              <span className="riyo-startup__core-label">SOSYAL RADAR</span>
            </div>
          </div>
          <h1 className="riyo-startup__headline">Aynı yerde, yeni bir hikâye.</h1>
          <p className="riyo-startup__intro">Keşfet. Tanış. Bir kahveyi paylaş.</p>
        </div>

        <footer className="riyo-startup__footer">
          <div role="status" aria-live="polite" aria-atomic="true" className="riyo-startup__status">
            {offline ? <WifiOff size={16} aria-hidden="true" /> : <span className="riyo-startup__dot" aria-hidden="true" />}
            <span>{status}</span>
          </div>
          <div className="riyo-startup__progress" aria-hidden="true"><span /></div>
          <div className="riyo-startup__recovery">
            {(slow || offline) && (
              <>
                <p>{offline ? "Bağlantını kontrol edip tekrar dene." : "Bağlantını kontrol edebilir veya sayfayı yenileyebilirsin."}</p>
                <Button variant="outline" className="riyo-startup__retry" onClick={() => window.location.reload()}>
                  <RefreshCw aria-hidden="true" />Sayfayı yenile
                </Button>
              </>
            )}
          </div>
          <div className="riyo-startup__signature"><span>Riyo</span><span>Senin şehrin. Senin çevren.</span></div>
        </footer>
      </div>
    </main>
  );
}
