import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("pwa_dismissed")) return;

    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa_dismissed", "1");
  };

  if (dismissed || isStandalone()) return null;

  if (showIOSGuide) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="mx-3 mb-3 rounded-xl bg-card border border-border p-4 shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <p className="font-semibold text-sm text-foreground">Install Siliyoung Enterprise ERP</p>
            <button onClick={handleDismiss} className="text-muted-foreground text-lg leading-none">&times;</button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tap the <span className="inline-block mx-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline text-primary"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </span> Share button, then select <strong>"Add to Home Screen"</strong>
          </p>
        </div>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-auto max-w-md mx-auto mb-3">
      <div className="rounded-xl bg-card border border-border px-4 py-2.5 shadow-lg flex items-center gap-3">
        <p className="text-sm text-foreground font-medium whitespace-nowrap">Install Siliyoung Enterprise ERP</p>
        <button onClick={handleDismiss} className="text-xs text-muted-foreground px-2 py-1 shrink-0">Later</button>
        <button onClick={handleInstall} className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg shrink-0">Install</button>
      </div>
    </div>
  );
}
