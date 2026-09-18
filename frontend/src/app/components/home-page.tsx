import { ArrowRight, CheckCircle2, Database, Link2, ScanSearch, ShieldCheck } from "lucide-react";
import { GlassCard } from "./glass-card";
import { Button } from "./button";
import { useScans } from "../../hooks/useScans";

interface HomePageProps { userName: string; onNavigate: (view: string) => void; }

export function HomePage({ userName, onNavigate }: HomePageProps) {
  const { scans, loading } = useScans();
  const actions = [
    { title: "Scan a message", description: "Analyze suspicious text for risk signals.", icon: ScanSearch, action: () => onNavigate("scan") },
    { title: "Inspect a URL", description: "Check a link before you open it.", icon: Link2, action: () => onNavigate("url-scanner") },
    { title: "Review history", description: "See analysis returned by your account.", icon: Database, action: () => onNavigate("history") },
  ];

  return (
    <div className="min-h-screen ml-0 md:ml-64 p-5 md:p-8 pt-24 md:pt-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-9"><p className="eyebrow mb-3"><span className="status-dot" /> PERSONAL SECURITY WORKSPACE</p><h1 className="text-4xl md:text-5xl font-semibold mb-2">Welcome back, {userName}.</h1><p className="text-muted-foreground">Your next careful decision starts here.</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {actions.map((action) => <GlassCard key={action.title} className="p-6 cursor-pointer group" onClick={action.action}><div className="flex items-start justify-between"><div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center"><action.icon className="w-5 h-5 text-primary" /></div><ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" /></div><h2 className="text-lg font-semibold mt-7">{action.title}</h2><p className="text-sm text-muted-foreground mt-2">{action.description}</p></GlassCard>)}
        </div>
        <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-4">
          <GlassCard className="p-6" hover={false}><div className="flex items-center justify-between mb-6"><div><h2 className="text-xl font-semibold">Recent activity</h2><p className="text-sm text-muted-foreground mt-1">Only completed scans from your account appear here.</p></div><ShieldCheck className="w-5 h-5 text-primary" /></div>{loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}</div> : scans.length === 0 ? <div className="empty-state py-10"><Database className="w-8 h-8 text-primary" /><h3 className="font-semibold mt-4">No scans yet</h3><p className="text-sm text-muted-foreground mt-2">Start your first security scan to build your history.</p><Button className="mt-5" onClick={() => onNavigate("scan")}>Start a scan</Button></div> : <div className="space-y-2">{scans.slice(0, 5).map((scan) => <div key={scan.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-white/[.025] px-4 py-3"><div className="min-w-0"><p className="text-sm truncate">{scan.input}</p><p className="text-xs text-muted-foreground mt-1">{scan.inputType}</p></div><span className="text-xs text-muted-foreground whitespace-nowrap">{scan.result?.riskLevel ?? "Analyzed"}</span></div>)}</div>}</GlassCard>
          <GlassCard className="p-6" hover={false}><div className="flex items-center gap-3 mb-5"><div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-success" /></div><div><h2 className="font-semibold">Security habits</h2><p className="text-xs text-muted-foreground">A useful second look</p></div></div><div className="space-y-5 text-sm"><p className="text-muted-foreground">Verify the sender before acting on an urgent request.</p><p className="text-muted-foreground">Inspect the destination of a link before opening it.</p><p className="text-muted-foreground">Never share credentials or one-time codes in a message.</p></div></GlassCard>
        </div>
      </div>
    </div>
  );
}
