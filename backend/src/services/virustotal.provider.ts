import { ThreatIntelligenceProvider, ExternalThreatIntelligence } from './threat-intelligence.provider';
import { logSecurityEvent } from '../utils/security-logger';

const VIRUSTOTAL_BASE_URL = 'https://www.virustotal.com/api/v3';
const REQUEST_TIMEOUT_MS = 5000;

function emptyResult(status: ExternalThreatIntelligence['status'], message?: string): ExternalThreatIntelligence {
  return {
    provider: 'VirusTotal',
    status,
    malicious: null,
    suspicious: null,
    harmless: null,
    undetected: null,
    timeout: null,
    reputation: null,
    categories: [],
    detections: [],
    queriedAt: null,
    lastAnalysisAt: null,
    confidence: null,
    ...(message ? { message } : {}),
  };
}

function toUrlId(url: string) {
  return Buffer.from(url, 'utf8').toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseReport(body: unknown): ExternalThreatIntelligence {
  const attributes = (body as { data?: { attributes?: Record<string, unknown> } })?.data?.attributes;
  if (!attributes) return emptyResult('ERROR', 'VirusTotal returned an invalid report.');

  const stats = (attributes.last_analysis_stats as Record<string, unknown> | undefined) || {};
  const rawResults = (attributes.last_analysis_results as Record<string, { category?: unknown; result?: unknown }> | undefined) || {};
  const detections = Object.entries(rawResults)
    .filter(([, result]) => result.category === 'malicious' || result.category === 'suspicious')
    .slice(0, 20)
    .map(([engine, result]) => ({ engine, category: String(result.category), result: String(result.result || 'Detection reported') }));
  const rawCategories = attributes.categories;
  const categories = rawCategories && typeof rawCategories === 'object'
    ? [...new Set(Object.values(rawCategories as Record<string, unknown>).filter((value): value is string => typeof value === 'string'))]
    : [];

  return {
    provider: 'VirusTotal',
    status: 'FOUND',
    // A missing field is unknown, not a clean result.
    malicious: typeof stats.malicious === 'number' ? stats.malicious : null,
    suspicious: typeof stats.suspicious === 'number' ? stats.suspicious : null,
    harmless: typeof stats.harmless === 'number' ? stats.harmless : null,
    undetected: typeof stats.undetected === 'number' ? stats.undetected : null,
    timeout: typeof stats.timeout === 'number' ? stats.timeout : null,
    reputation: typeof attributes.reputation === 'number' ? attributes.reputation : null,
    categories,
    detections,
    queriedAt: new Date().toISOString(),
    lastAnalysisAt: typeof attributes.last_analysis_date === 'number' ? new Date(attributes.last_analysis_date * 1000).toISOString() : null,
    confidence: Object.keys(stats).length > 0 ? 0.9 : 0.7,
  };
}

export class VirusTotalProvider implements ThreatIntelligenceProvider {
  private readonly apiKey = process.env.VIRUSTOTAL_API_KEY?.trim();

  getStatus() {
    return { provider: 'VirusTotal', configured: Boolean(this.apiKey) };
  }

  async lookupUrl(url: string): Promise<ExternalThreatIntelligence> {
    if (!this.apiKey) {
      logSecurityEvent('provider_status', { provider: 'virustotal', status: 'unavailable', configured: false });
      return emptyResult('UNAVAILABLE', 'External threat intelligence is unavailable because the provider is not configured.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      logSecurityEvent('provider_status', { provider: 'virustotal', status: 'lookup_started' });
      const response = await fetch(`${VIRUSTOTAL_BASE_URL}/urls/${toUrlId(url)}`, {
        headers: { 'x-apikey': this.apiKey, accept: 'application/json' },
        signal: controller.signal,
      });
      if (response.status === 404) {
        logSecurityEvent('provider_status', { provider: 'virustotal', status: 'not_found' });
        return { ...emptyResult('NOT_FOUND', 'No existing VirusTotal report was found. Absence of a report does not mean the URL is safe.'), queriedAt: new Date().toISOString() };
      }
      if (response.status === 429) {
        logSecurityEvent('provider_status', { provider: 'virustotal', status: 'rate_limited' });
        return { ...emptyResult('RATE_LIMITED', 'VirusTotal rate limit reached.'), queriedAt: new Date().toISOString() };
      }
      if (response.status === 401 || response.status === 403) {
        logSecurityEvent('provider_status', { provider: 'virustotal', status: 'credentials_rejected' });
        return { ...emptyResult('UNAVAILABLE', 'VirusTotal credentials were rejected.'), queriedAt: new Date().toISOString() };
      }
      if (!response.ok) return { ...emptyResult(response.status >= 500 ? 'UNAVAILABLE' : 'ERROR', 'VirusTotal could not complete the report lookup.'), queriedAt: new Date().toISOString() };
      logSecurityEvent('provider_status', { provider: 'virustotal', status: 'found' });
      return parseReport(await response.json());
    } catch (error) {
      const status = error instanceof Error && error.name === 'AbortError' ? 'UNAVAILABLE' : 'ERROR';
      logSecurityEvent('provider_status', { provider: 'virustotal', status: status.toLowerCase() });
      return { ...emptyResult(status, status === 'UNAVAILABLE' ? 'External threat intelligence is temporarily unavailable.' : 'VirusTotal lookup failed.'), queriedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }
}
