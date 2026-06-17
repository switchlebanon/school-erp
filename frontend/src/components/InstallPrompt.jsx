import { useState, useEffect } from "react";
import { C } from "../theme";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // On iOS, show manual instructions after 3 seconds
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome: listen for the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === "accepted") {
      sessionStorage.setItem("pwa-prompt-dismissed", "1");
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 16,
      left: 16,
      right: 16,
      zIndex: 9999,
      background: C.navy,
      color: "#fff",
      borderRadius: 14,
      padding: "16px 18px",
      boxShadow: "0 8px 32px rgba(15,23,42,0.4)",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      maxWidth: 420,
      margin: "0 auto",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: "#3D7EFF",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>📱</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          Install S³ ERP
        </div>

        {isIOS ? (
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
            Tap <strong style={{ color: "#fff" }}>Share</strong> then{" "}
            <strong style={{ color: "#fff" }}>Add to Home Screen</strong>{" "}
            to install this app on your iPhone.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
            Install on your phone for quick access — works offline too.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!isIOS && (
            <button onClick={handleInstall} style={{
              background: "#3D7EFF", color: "#fff", border: "none",
              borderRadius: 8, padding: "7px 16px", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>
              Install
            </button>
          )}
          <button onClick={handleDismiss} style={{
            background: "transparent", color: "#94A3B8",
            border: "1px solid #334155", borderRadius: 8,
            padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            {isIOS ? "Got it" : "Not now"}
          </button>
        </div>
      </div>

      <button onClick={handleDismiss} style={{
        background: "none", border: "none", color: "#64748B",
        cursor: "pointer", fontSize: 18, padding: 0, flexShrink: 0,
        lineHeight: 1,
      }}>✕</button>
    </div>
  );
}
