import { ArrowRight, CircleCheck, Play, ShieldCheck } from "lucide-react";
import { Button } from "./button";

export function HeroSection({ onAnalyzeClick }: { onAnalyzeClick: () => void }) {
  return (
    <section className="hero-section relative min-h-screen flex items-center px-4 py-28 overflow-hidden">
      <div className="hero-grid" />
      <div className="hero-orbit hero-orbit--one" />
      <div className="hero-orbit hero-orbit--two" />

      <div className="max-w-6xl mx-auto w-full z-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div className="text-left">
            <div className="eyebrow mb-6"><span className="status-dot" /> AI-POWERED THREAT ANALYSIS</div>

            <h1 className="hero-title mb-6">
              Clarity when the<br /><span>message feels wrong.</span>
            </h1>

            <p className="hero-copy mb-9 max-w-xl">
              ScamShield AI helps you inspect suspicious messages and links before they become a problem. Fast, private, and built for the moments that demand a second look.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <Button size="lg" onClick={onAnalyzeClick}>
                <ShieldCheck className="w-5 h-5 mr-2" />
                Analyze a message
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                <Play className="w-4 h-4 mr-2" />
                See how it works
              </Button>
            </div>

            <div className="hero-proof mt-9">
              <CircleCheck className="w-4 h-4 text-success" />
              <span>No account required to explore the experience</span>
            </div>
          </div>

          <div className="hero-console" aria-label="ScamShield security engine visual">
            <div className="console-header">
              <div className="flex items-center gap-2"><span className="status-dot" /> ENGINE STATUS</div>
              <span className="console-live">LIVE</span>
            </div>
            <div className="console-shield">
              <div className="console-radar" />
              <ShieldCheck className="w-28 h-28 text-primary relative z-10" strokeWidth={1.1} />
            </div>
            <div className="console-readout">
              <div><span>MODE</span><strong>PROTECTIVE</strong></div>
              <div><span>INPUTS</span><strong>SMS · URL · EMAIL</strong></div>
              <div><span>STATUS</span><strong className="text-success">READY</strong></div>
            </div>
            <div className="console-line"><span /> <span /> <span /> <span /> <span /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
