import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GlassCard } from "./glass-card";
import { Button } from "./button";
import api, { getApiErrorMessage } from "../../services/api";
import type { ExternalThreatIntelligence, ExternalThreatIntelligenceCollection, InfrastructureIntelligence, ScanRecord } from "../../hooks/useScans";

const analysisStages = ["Validating URL", "Running local analysis", "Querying threat intelligence", "Inspecting DNS, registration, and TLS", "Correlating evidence", "Persisting scan"];

function isProviderCollection(value: ExternalThreatIntelligence | ExternalThreatIntelligenceCollection): value is ExternalThreatIntelligenceCollection {
  return "providers" in value;
}

function providerMessage(provider: ExternalThreatIntelligence) {
  if (provider.status === "NOT_FOUND") return provider.provider === "VirusTotal" ? "No VirusTotal report available for this URL. This does not mean the URL is safe." : "No matching provider report was returned. This does not mean the URL is safe.";
  if (provider.status === "RATE_LIMITED") return "Provider rate limited. Local analysis was still completed.";
  if (provider.status === "ERROR") return "Provider error. Local analysis was still completed.";
  if (provider.status === "UNAVAILABLE") return provider.message || "Provider unavailable. Local analysis was still completed.";
  return "";
}

function ProviderCard({ provider }: { provider: ExternalThreatIntelligence }) {
  const isVirusTotal = provider.provider === "VirusTotal";
  return <GlassCard className="p-4" hover={false}>
    <div className="flex items-center justify-between gap-3 mb-4"><span className="font-semibold">{provider.provider}</span><span className={`text-xs ${provider.status === "FOUND" ? "text-success" : "text-muted-foreground"}`}>{provider.status}</span></div>
    {provider.status === "FOUND" ? <>
      <p className="text-sm text-muted-foreground mb-3">{isVirusTotal ? "VirusTotal intelligence available" : `${provider.provider} intelligence available`}</p>
      {isVirusTotal && <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">{[["Malicious", provider.malicious], ["Suspicious", provider.suspicious], ["Harmless", provider.harmless], ["Undetected", provider.undetected], ["Timeout", provider.timeout]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-white/[.025] p-3"><div className="text-lg font-semibold">{value ?? "Unknown"}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div>}
      {provider.threatTypes && provider.threatTypes.length > 0 && <p className="text-sm text-muted-foreground">Threat types: {provider.threatTypes.join(", ")}</p>}
      {provider.reputation !== null && <p className="text-sm text-muted-foreground mt-3">Reputation: {provider.reputation}</p>}
      {provider.categories.length > 0 && <p className="text-sm text-muted-foreground mt-2">Categories: {provider.categories.join(", ")}</p>}
      {provider.detections.length > 0 && <div className="mt-4 space-y-2">{provider.detections.slice(0, 5).map((detection) => <p key={`${detection.engine}-${detection.result}`} className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{detection.engine}</span>: {detection.result}</p>)}</div>}
      {provider.lastAnalysisAt && <p className="text-xs text-muted-foreground mt-4">Last analysis {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(provider.lastAnalysisAt))}</p>}
      {provider.expireTime && <p className="text-xs text-muted-foreground mt-4">Evidence expires {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(provider.expireTime))}</p>}
    </> : <p className="text-sm text-muted-foreground">{providerMessage(provider)}</p>}
    {provider.queriedAt && <p className="text-xs text-muted-foreground mt-4">Queried {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(provider.queriedAt))}</p>}
  </GlassCard>;
}

function InfrastructureCard({ infrastructure }: { infrastructure: InfrastructureIntelligence }) {
  const values = (items: string[]) => items.length > 0 ? items.join(", ") : "No records returned";
  return <GlassCard className="p-4" hover={false}>
    <div className="flex items-center justify-between mb-4"><span className="font-semibold">Infrastructure intelligence</span><span className="text-xs text-muted-foreground">{infrastructure.status}</span></div>
    <div className="space-y-4 text-sm">
      <div><div className="flex justify-between gap-3"><span className="font-medium">DNS</span><span className="text-xs text-muted-foreground">{infrastructure.dns.status}</span></div><p className="text-muted-foreground mt-1">A: {values(infrastructure.dns.aRecords)}</p><p className="text-muted-foreground">AAAA: {values(infrastructure.dns.aaaaRecords)}</p>{infrastructure.dns.cnameRecords.length > 0 && <p className="text-muted-foreground">CNAME: {values(infrastructure.dns.cnameRecords)}</p>}{infrastructure.dns.message && <p className="text-muted-foreground mt-1">{infrastructure.dns.message}</p>}</div>
      <div><div className="flex justify-between gap-3"><span className="font-medium">Domain registration</span><span className="text-xs text-muted-foreground">{infrastructure.registration.status}</span></div>{infrastructure.registration.registrar && <p className="text-muted-foreground mt-1">Registrar: {infrastructure.registration.registrar}</p>}{infrastructure.registration.registrationDate && <p className="text-muted-foreground">Registered: {infrastructure.registration.registrationDate}</p>}{infrastructure.registration.expirationDate && <p className="text-muted-foreground">Expires: {infrastructure.registration.expirationDate}</p>}{infrastructure.registration.nameservers.length > 0 && <p className="text-muted-foreground">Nameservers: {values(infrastructure.registration.nameservers)}</p>}{infrastructure.registration.message && <p className="text-muted-foreground mt-1">{infrastructure.registration.message}</p>}</div>
      <div><div className="flex justify-between gap-3"><span className="font-medium">TLS certificate</span><span className="text-xs text-muted-foreground">{infrastructure.tls.status}</span></div>{infrastructure.tls.status === "NOT_APPLICABLE" ? <p className="text-muted-foreground mt-1">TLS intelligence is not applicable to this URL.</p> : <>{infrastructure.tls.issuer && <p className="text-muted-foreground mt-1">Issuer: {infrastructure.tls.issuer}</p>}{infrastructure.tls.subject && <p className="text-muted-foreground">Subject: {infrastructure.tls.subject}</p>}{infrastructure.tls.validFrom && infrastructure.tls.validTo && <p className="text-muted-foreground">Valid: {infrastructure.tls.validFrom} to {infrastructure.tls.validTo}</p>}{typeof infrastructure.tls.hostnameMatch === "boolean" && <p className="text-muted-foreground">Hostname match: {infrastructure.tls.hostnameMatch ? "yes" : "no"}</p>}{infrastructure.tls.message && <p className="text-muted-foreground mt-1">{infrastructure.tls.message}</p>}</>}</div>
    </div>
    {infrastructure.signals.length > 0 && <div className="mt-4 space-y-2">{infrastructure.signals.map((item) => <p key={item.id} className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{item.title}</span>: {item.description}</p>)}</div>}
  </GlassCard>;
}

export function ScanView() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!analyzing) return;
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, analysisStages.length - 1)), 520);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const analyzeUrl = async () => {
    setAnalyzing(true);
    setStage(0);
    setError("");
    setResult(null);
    try {
      const response = await api.post<{ data: ScanRecord }>("/scans", { url });
      setResult(response.data.data);
    } catch (scanError) {
      setError(getApiErrorMessage(scanError, "The security engine could not complete this scan."));
    } finally {
      setAnalyzing(false);
    }
  };

  const clear = () => { setUrl(""); setResult(null); setError(""); };
  const risk = result?.result?.riskLevel?.toLowerCase() ?? "";
  const riskTone = risk.includes("high") ? "danger" : risk.includes("medium") ? "warning" : "safe";
  const rawVerdict = result?.result?.analysis?.verdict ?? result?.result?.classification ?? result?.result?.riskLevel ?? "";
  const verdict = rawVerdict === "SAFE" ? "LOW RISK — NOT A SAFETY GUARANTEE" : rawVerdict;
  const signals = result?.result?.analysis?.signals ?? [];
  const externalValue = result?.result?.externalIntelligence;
  const providers = externalValue ? isProviderCollection(externalValue) ? externalValue.providers : [externalValue] : [];
  const evidenceSummary = externalValue && isProviderCollection(externalValue) ? externalValue : null;

  return <div className="min-h-screen ml-0 md:ml-64 p-5 md:p-8 pt-24 md:pt-8"><div className="max-w-5xl mx-auto">
    <div className="mb-8"><p className="eyebrow mb-3"><span className="status-dot" /> URL SECURITY ANALYSIS</p><h1 className="text-4xl font-bold mb-2">Scan URL</h1><p className="text-muted-foreground">Analyze observable URL and domain signals before you open a link.</p></div>
    <GlassCard className="p-6 md:p-8 mb-6" hover={false}><label className="block mb-3 text-lg font-semibold" htmlFor="scan-url">Target URL</label><textarea id="scan-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" rows={3} maxLength={2048} className="w-full p-4 bg-input rounded-lg border border-border focus:border-primary focus:outline-none resize-none mb-4 text-foreground" /><p className="text-xs text-muted-foreground mb-4">Configured scans may send the URL to threat-intelligence providers and perform DNS, registration, and TLS lookups. Page content is not downloaded.</p><div className="flex flex-col sm:flex-row gap-3"><Button onClick={analyzeUrl} disabled={!url.trim() || analyzing} className="flex-1">{analyzing ? <><Zap className="w-5 h-5 mr-2 animate-pulse" />Analyzing...</> : <><Shield className="w-5 h-5 mr-2" />Analyze URL</>}</Button><Button variant="outline" onClick={clear}>Clear</Button></div></GlassCard>
    <AnimatePresence>
      {analyzing && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><GlassCard className="p-6 md:p-8 mb-6" hover={false}><div className="flex items-start gap-4"><Zap className="w-8 h-8 text-primary animate-pulse shrink-0" /><div className="w-full"><div className="font-semibold mb-1">Analysis in progress</div><div className="text-sm text-muted-foreground">{analysisStages[stage]}...</div><div className="mt-4 flex gap-2">{analysisStages.map((item, index) => <span key={item} className={`h-1 flex-1 rounded-full ${index <= stage ? "bg-primary" : "bg-muted"}`} />)}</div></div></div></GlassCard></motion.div>}
      {error && !analyzing && <GlassCard className="p-5 mb-6 border-destructive/30 text-destructive" hover={false}><div className="flex items-center gap-3"><AlertTriangle className="w-5 h-5" />{error}</div></GlassCard>}
      {result && !analyzing && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><GlassCard className="p-6 md:p-8 mb-6" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"><div><p className="eyebrow mb-2"><span className="status-dot" /> {result.status}</p><h2 className="text-2xl font-bold">Scan result</h2></div><div className={`px-4 py-2 rounded-full text-sm font-semibold self-start ${riskTone === "danger" ? "bg-destructive/20 text-destructive" : riskTone === "warning" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>{verdict}</div></div>
        <div className="rounded-lg border border-border/40 bg-white/[.025] p-4 mb-8"><p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Target</p><p className="break-all">{result.target || result.input}</p></div>
        <div className="mb-8"><div className="flex items-end justify-between gap-4 mb-3"><div><span className="text-xl block">Risk score</span><span className="text-xs text-muted-foreground">Evidence quality: {result.result?.analysis?.evidenceQuality || "LOCAL_ONLY"} ({Math.round((result.result?.confidence ?? 0) * 100)}%)</span></div><span className="text-4xl font-bold text-primary">{result.result?.riskScore ?? 0}%</span></div><div className="w-full h-4 bg-muted rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${result.result?.riskScore ?? 0}%` }} transition={{ duration: 1, ease: "easeOut" }} className={`h-full ${riskTone === "danger" ? "bg-destructive" : riskTone === "warning" ? "bg-warning" : "bg-success"}`} /></div></div>
        <div className="mb-8"><h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><CircleDot className="w-6 h-6 text-primary" />Local analysis</h3><GlassCard className="p-4" hover={false}><p className="text-muted-foreground">{result.result?.explanation || "No additional explanation was returned."}</p></GlassCard><div className="space-y-3 mt-4">{signals.length ? signals.map((signal) => <div key={signal.type} className="rounded-lg border border-border/40 bg-white/[.025] p-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold capitalize">{signal.title || signal.type.replace(/_/g, " ")}</span><span className="text-xs uppercase tracking-wider text-muted-foreground">{signal.severity} · +{signal.scoreContribution ?? signal.points}</span></div><p className="text-sm text-muted-foreground mt-2">{signal.description || signal.message}</p><p className="text-xs text-muted-foreground mt-2">Source: {signal.source || "LOCAL_ANALYSIS"} · Confidence: {Math.round((signal.confidence ?? 0) * 100)}%</p></div>) : <GlassCard className="p-4" hover={false}><p className="text-muted-foreground">No structural risk signals were detected.</p></GlassCard>}</div></div>
        <div className="mb-8"><h3 className="text-xl font-semibold mb-4">External threat intelligence</h3><div className="space-y-3">{providers.length ? providers.map((provider) => <ProviderCard key={provider.provider} provider={provider} />) : <GlassCard className="p-4" hover={false}><p className="text-muted-foreground">No external providers returned a result.</p></GlassCard>}</div>{evidenceSummary && <p className="text-xs text-muted-foreground mt-3">{evidenceSummary.externalProvidersFound} provider report(s) available, {evidenceSummary.externalProvidersAvailable} provider(s) responded. Correlation: {result.result?.analysis?.evidenceQuality || "LOCAL_ONLY"}. Provider availability and risk contribution are evaluated separately.</p>}</div>
        {result.result?.analysis?.infrastructureIntelligence && <div className="mb-8"><h3 className="text-xl font-semibold mb-4">Infrastructure intelligence</h3><InfrastructureCard infrastructure={result.result.analysis.infrastructureIntelligence} /></div>}
        <div><h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-primary" />Recommendation</h3><p className="text-muted-foreground">{result.result?.recommendation || "No recommendation was returned."}</p></div>
      </GlassCard></motion.div>}
    </AnimatePresence>
  </div></div>;
}
