import { ArrowRight, ShieldCheck } from "lucide-react";
import { GlassCard } from "./glass-card";
import { Button } from "./button";

export function LiveDemo({ onAnalyzeClick }: { onAnalyzeClick: () => void }) {
  return (
    <section className="relative py-20 px-4">
      <div className="max-w-5xl mx-auto"><div className="text-center mb-10"><p className="eyebrow justify-center mb-4"><span className="status-dot" /> REAL-TIME ANALYSIS</p><h2 className="text-4xl md:text-5xl font-semibold mb-4">Bring the message. Get clarity.</h2><p className="text-lg text-muted-foreground max-w-2xl mx-auto">The live scanner uses your authenticated account and the security engine. No sample verdicts, no invented history.</p></div>
        <GlassCard className="p-6 md:p-8" hover={false}><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div><div><h3 className="font-semibold">Secure message analysis</h3><p className="text-sm text-muted-foreground">Ready when you are</p></div></div><div className="rounded-lg border border-border/50 bg-black/20 p-5 min-h-28 flex items-center text-muted-foreground text-sm">Sign in to send a message to the real ScamShield analysis engine.</div><Button className="w-full mt-5" onClick={onAnalyzeClick}>Open secure scanner <ArrowRight className="w-4 h-4 ml-2" /></Button></GlassCard>
      </div>
    </section>
  );
}
