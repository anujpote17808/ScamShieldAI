import { BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import { GlassCard } from "./glass-card";

export function DashboardPreview() {
  return (
    <section className="relative py-20 px-4"><div className="max-w-7xl mx-auto"><div className="text-center mb-12"><p className="eyebrow justify-center mb-4"><span className="status-dot" /> YOUR SECURITY CONSOLE</p><h2 className="text-4xl md:text-5xl font-semibold mb-4">A dashboard that tells the truth.</h2><p className="text-lg text-muted-foreground">Your overview is built from your own completed scans, with empty states until there is something to report.</p></div><GlassCard className="p-6 md:p-8" hover={false}><div className="grid md:grid-cols-3 gap-4"><div className="rounded-lg border border-border/40 bg-white/[.025] p-5"><BarChart3 className="w-5 h-5 text-primary mb-8" /><p className="text-sm font-semibold">Activity overview</p><p className="text-xs text-muted-foreground mt-2">Appears after your first scan</p></div><div className="rounded-lg border border-border/40 bg-white/[.025] p-5"><ShieldCheck className="w-5 h-5 text-success mb-8" /><p className="text-sm font-semibold">Risk breakdown</p><p className="text-xs text-muted-foreground mt-2">Derived from engine results</p></div><div className="rounded-lg border border-border/40 bg-white/[.025] p-5"><LockKeyhole className="w-5 h-5 text-accent mb-8" /><p className="text-sm font-semibold">Private by default</p><p className="text-xs text-muted-foreground mt-2">Only your records appear here</p></div></div></GlassCard></div></section>
  );
}
