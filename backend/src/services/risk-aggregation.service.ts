import { ExternalThreatIntelligence, ExternalThreatIntelligenceCollection } from './threat-intelligence.provider';
import { UrlAnalysisResult } from './url-analysis.service';
import { RiskSignal } from './risk-signal';
import { InfrastructureIntelligence } from './infrastructure-intelligence.service';

function hasExternalThreat(provider: ExternalThreatIntelligence) {
  return provider.status === 'FOUND' && ((provider.malicious || 0) > 0 || (provider.suspicious || 0) > 0 || (provider.threatTypes?.length || 0) > 0);
}

function providerBoost(provider: ExternalThreatIntelligence) {
  if (provider.status !== 'FOUND') return 0;
  if (provider.provider === 'VirusTotal') {
    // Explicit scoring: 10 points per malicious engine (max 50), 4 per
    // suspicious engine (max 20), and negative reputation (max 15). A report
    // with no such evidence, a NOT_FOUND result, or any provider error adds 0.
    return Math.min(50, (provider.malicious || 0) * 10) + Math.min(20, (provider.suspicious || 0) * 4) + ((provider.reputation || 0) < 0 ? Math.min(15, Math.abs(provider.reputation || 0)) : 0);
  }
  if (provider.provider === 'Google Web Risk') {
    // Google only contributes points for threat types it actually returns.
    const weights: Record<string, number> = { MALWARE: 40, SOCIAL_ENGINEERING: 35, UNWANTED_SOFTWARE: 20 };
    return Math.min(40, Math.max(...(provider.threatTypes || []).map((type) => weights[type] || 0), 0));
  }
  return 0;
}

function providerReasons(provider: ExternalThreatIntelligence): RiskSignal[] {
  const boost = providerBoost(provider);
  if (boost === 0) return [];
  const source = provider.provider === 'Google Web Risk' ? 'GOOGLE_WEB_RISK' : 'VIRUSTOTAL';
  const threatEvidence = provider.provider === 'Google Web Risk'
    ? (provider.threatTypes || []).join(', ')
    : `malicious=${provider.malicious}, suspicious=${provider.suspicious}`;
  return [{
    id: `${provider.provider.toLowerCase().replaceAll(' ', '-')}-evidence`,
    category: 'THREAT_INTELLIGENCE',
    source,
    severity: boost >= 35 ? 'high' : 'medium',
    scoreContribution: boost,
    title: `${provider.provider} threat evidence`,
    description: `${provider.provider} returned: ${threatEvidence}.`,
    evidence: threatEvidence,
    confidence: provider.confidence || 0.7,
  }];
}

export function aggregateRisk(local: UrlAnalysisResult, providers: ExternalThreatIntelligence[], infrastructure: InfrastructureIntelligence) {
  const foundProviders = providers.filter((provider) => provider.status === 'FOUND');
  const threatProviders = foundProviders.filter(hasExternalThreat);
  const availableProviders = providers.filter((provider) => provider.status === 'FOUND' || provider.status === 'NOT_FOUND');
  const threatFlags = foundProviders.map(hasExternalThreat);
  const conflicts = threatFlags.length > 1 && new Set(threatFlags).size > 1;
  // Correlation describes real report availability, independently from risk
  // contribution. A FOUND report with zero detections is still external evidence;
  // it just contributes zero points. Multiple FOUND reports agree when their
  // threat-evidence presence is consistent, and conflict when it differs.
  const agreement = foundProviders.length > 1 && !conflicts;
  // Infrastructure signals are independently scored and capped at 30; the mere
  // presence of DNS/TLS/RDAP data contributes nothing.
  const infrastructureBoost = Math.min(30, infrastructure.signals.reduce((total, item) => total + item.scoreContribution, 0));
  const correlation = agreement ? 'MULTI_PROVIDER_AGREEMENT' : conflicts ? 'CONFLICTING_EXTERNAL_EVIDENCE' : foundProviders.length === 1 ? 'SINGLE_EXTERNAL_PROVIDER' : infrastructure.signals.length > 0 ? 'INFRASTRUCTURE_ONLY' : 'LOCAL_ONLY';
  const externalBoost = Math.min(65, providers.reduce((total, provider) => total + providerBoost(provider), 0));
  const riskScore = Math.min(100, local.riskScore + externalBoost + infrastructureBoost);
  const maliciousEvidence = threatProviders.some((provider) => provider.provider === 'VirusTotal' && (provider.malicious || 0) > 0) || threatProviders.some((provider) => provider.provider === 'Google Web Risk' && (provider.threatTypes || []).includes('MALWARE'));
  const suspiciousEvidence = threatProviders.some((provider) => provider.provider === 'VirusTotal' && (provider.suspicious || 0) > 0) || threatProviders.some((provider) => provider.provider === 'Google Web Risk' && (provider.threatTypes || []).includes('SOCIAL_ENGINEERING'));
  const verdict = maliciousEvidence || riskScore >= 45 ? 'DANGEROUS' : suspiciousEvidence || riskScore >= 20 ? 'SUSPICIOUS' : 'SAFE';
  const localConfidence = local.signals.length === 0 ? 0.35 : Math.min(0.85, 0.55 + local.signals.length * 0.1);
  const externalConfidences = foundProviders.map((provider) => provider.confidence).filter((confidence): confidence is number => confidence !== null);
  const confidence = externalConfidences.length > 0 ? Number(((localConfidence + externalConfidences.reduce((sum, value) => sum + value, 0) / externalConfidences.length) / 2).toFixed(2)) : localConfidence;
  const reasons = [...local.signals.map((signal) => ({ ...signal })), ...providers.flatMap(providerReasons), ...infrastructure.signals];
  const statusSummary = providers.map((provider) => `${provider.provider}: ${provider.status}`).join('; ');
  const explanation = `Local analysis scored ${local.riskScore}. ${statusSummary}. Infrastructure status: ${infrastructure.status}. Evidence correlation: ${correlation}. External evidence contributed ${externalBoost} points and infrastructure evidence contributed ${infrastructureBoost} points. ${local.explanation}`;
  const recommendation = verdict === 'DANGEROUS' ? 'Do not open the link or submit information. Verify the destination through an official channel.' : verdict === 'SUSPICIOUS' ? 'Use caution and verify the destination independently before opening it.' : 'No structural concerns were detected. Continue to verify the sender and context.';
  const externalIntelligence: ExternalThreatIntelligenceCollection = { providers, externalProvidersAvailable: availableProviders.length, externalProvidersFound: foundProviders.length, agreement, conflicts };

  return { riskScore, verdict, externalBoost, infrastructureBoost, explanation, recommendation, reasons, confidence, evidenceQuality: correlation, externalIntelligence, infrastructureIntelligence: infrastructure };
}
