import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

interface StartupOverlayProps {
  onComplete: () => void;
}

export function StartupOverlay({ onComplete }: StartupOverlayProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 120 : 1900;
    const exitTimer = window.setTimeout(() => setExiting(true), Math.max(delay - 360, 0));
    const completeTimer = window.setTimeout(onComplete, delay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`startup-overlay ${exiting ? "startup-overlay--exit" : ""}`} aria-label="Loading ScamShield AI">
      <div className="startup-grid" />
      <div className="startup-scanline" />
      <div className="startup-content">
        <div className="startup-mark">
          <ShieldCheck className="h-12 w-12" strokeWidth={1.5} />
          <span className="startup-ring startup-ring--one" />
          <span className="startup-ring startup-ring--two" />
        </div>
        <p className="startup-kicker">SCAMSHIELD AI</p>
        <p className="startup-status"><span /> Initializing security engine...</p>
      </div>
    </div>
  );
}