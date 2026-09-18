import { AlertTriangle, CheckCircle2, Clock3, Database, ShieldCheck } from "lucide-react";
import { GlassCard } from "./glass-card";
import { useScans } from "../../hooks/useScans";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function Dashboard() {
  const { scans, loading, error } = useScans();
  const threats = scans.filter((scan) => {
    const level = (scan.result?.riskLevel ?? "").toLowerCase();
    return Boolean(scan.result) && !level.includes("low") && !level.includes("safe");
  }).length;
  const safe = scans.filter((scan) => (scan.result?.riskLevel ?? "").toLowerCase().includes("low") || (scan.result?.riskLevel ?? "").toLowerCase().includes("safe")).length;
  const stats = [
    { label: "Total scans", value: scans.length, icon: ShieldCheck, color: "text-primary" },
    { label: "Threats detected", value: threats, icon: AlertTriangle, color: "text-destructive" },
    { label: "Safe results", value: safe, icon: CheckCircle2, color: "text-success" },
    { label: "Latest activity", value: scans.length ? formatDate(scans[0].createdAt) : "No activity", icon: Clock3, color: "text-accent" },
  ];

  return (
    <div className="min-h-screen ml-0 md:ml-64 p-5 md:p-8 pt-24 md:pt-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8"><p className="eyebrow mb-3"><span className="status-dot" /> SECURITY CONSOLE</p><h1 className="text-4xl md:text-5xl font-semibold mb-2">Dashboard</h1><p className="text-muted-foreground">A clear view of your account activity and analysis history.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => <GlassCard key={stat.label} className="p-5" hover={false}><div className="flex items-start justify-between"><stat.icon className={`w-5 h-5 ${stat.color}`} /><span className="text-[10px] uppercase tracking-[.14em] text-muted-foreground">Live data</span></div><div className="mt-7 text-2xl font-semibold truncate">{loading ? <span className="inline-block h-7 w-20 rounded bg-white/10 animate-pulse" /> : stat.value}</div><div className="text-sm text-muted-foreground mt-1">{stat.label}</div></GlassCard>)}
        </div>
        <GlassCard className="p-6" hover={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"><div><h2 className="text-xl font-semibold">Recent scans</h2><p className="text-sm text-muted-foreground mt-1">Records returned by your security engine.</p></div>{scans.length > 0 && <span className="text-xs text-success flex items-center gap-2"><span className="status-dot" /> Synced</span>}</div>
          {error && <div className="py-10 text-center text-destructive">Unable to load scan history right now.</div>}
          {!error && loading && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-14 rounded-lg bg-white/5 animate-pulse" />)}</div>}
          {!error && !loading && scans.length === 0 && <div className="empty-state"><Database className="w-8 h-8 text-primary" /><h3 className="text-lg font-semibold mt-4">No scans yet</h3><p className="text-sm text-muted-foreground mt-2">Start your first security scan to see analysis history here.</p></div>}
          {!loading && scans.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b border-border/50"><th className="text-left py-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground">Target URL</th><th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground">Verdict</th><th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground">Score</th><th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-muted-foreground">Intelligence</th><th className="text-left py-3 pl-4 text-xs uppercase tracking-wider text-muted-foreground">Created</th></tr></thead><tbody>{scans.slice(0, 8).map((scan) => { const level = scan.result?.analysis?.verdict ?? scan.result?.riskLevel ?? "Unknown"; const tone = level.toLowerCase().includes("danger") || level.toLowerCase().includes("high") ? "text-destructive bg-destructive/10" : level.toLowerCase().includes("suspicious") || level.toLowerCase().includes("medium") ? "text-warning bg-warning/10" : "text-success bg-success/10"; const intelligence = scan.result?.externalIntelligence; const intelStatus = !intelligence ? "NOT_AVAILABLE" : "providers" in intelligence ? intelligence.providers.map((provider) => `${provider.provider}: ${provider.status}`).join(" / ") : intelligence.status; return <tr key={scan.id} className="border-b border-border/20"><td className="py-4 pr-4 max-w-[280px] truncate">{scan.target || scan.input}</td><td className="px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tone}`}>{level}</span></td><td className="px-4">{scan.result?.riskScore ?? "-"}%</td><td className="px-4 text-xs text-muted-foreground">{intelStatus}</td><td className="pl-4 text-sm text-muted-foreground">{formatDate(scan.createdAt)}</td></tr>; })}</tbody></table></div>}
        </GlassCard>
      </div>
    </div>
  );
}
