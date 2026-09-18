import { ExternalThreatIntelligence, ThreatIntelligenceProvider } from './threat-intelligence.provider';
import { logSecurityEvent } from '../utils/security-logger';

const WEB_RISK_ENDPOINT = 'https://webrisk.googleapis.com/v1/uris:search';
const REQUEST_TIMEOUT_MS = 5000;
const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'];

function emptyResult(status: ExternalThreatIntelligence['status'], message?: string): ExternalThreatIntelligence {
  return {
    provider: 'Google Web Risk',
    status,
    malicious: null,
    suspicious: null,
    harmless: null,
    undetected: null,
    timeout: null,
    reputation: null,
    categories: [],
    detections: [],
    threatTypes: [],
    expireTime: null,
    queriedAt: null,
    lastAnalysisAt: null,
    confidence: null,
    ...(message ? { message } : {}),
  };
}

export class GoogleWebRiskProvider implements ThreatIntelligenceProvider {
  private readonly apiKey = process.env.GOOGLE_WEB_RISK_API_KEY?.trim();

  getStatus() {
    return { provider: 'Google Web Risk', configured: Boolean(this.apiKey) };
  }

  async lookupUrl(url: string): Promise<ExternalThreatIntelligence> {
    if (!this.apiKey) {
      logSecurityEvent('provider_status', { provider: 'google_web_risk', status: 'unavailable', configured: false });
      return emptyResult('UNAVAILABLE', 'Google Web Risk is unavailable because the provider is not configured.');
    }

    const query = new URLSearchParams({ key: this.apiKey, uri: url });
    THREAT_TYPES.forEach((threatType) => query.append('threatTypes', threatType));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      logSecurityEvent('provider_status', { provider: 'google_web_risk', status: 'lookup_started' });
      const response = await fetch(`${WEB_RISK_ENDPOINT}?${query.toString()}`, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      const queriedAt = new Date().toISOString();
      if (response.status === 429) {
        logSecurityEvent('provider_status', { provider: 'google_web_risk', status: 'rate_limited' });
        return { ...emptyResult('RATE_LIMITED', 'Google Web Risk rate limit reached.'), queriedAt };
      }
      if (response.status === 401 || response.status === 403) {
        logSecurityEvent('provider_status', { provider: 'google_web_risk', status: 'credentials_rejected' });
        return { ...emptyResult('UNAVAILABLE', 'Google Web Risk credentials were rejected.'), queriedAt };
      }
      if (response.status === 400) return { ...emptyResult('ERROR', 'Google Web Risk rejected the lookup request.'), queriedAt };
      if (response.status === 404) return { ...emptyResult('NOT_FOUND', 'No matching Google Web Risk threat was returned.'), queriedAt };
      if (!response.ok) return { ...emptyResult(response.status >= 500 ? 'UNAVAILABLE' : 'ERROR', 'Google Web Risk could not complete the lookup.'), queriedAt };

      const body = await response.json() as { threat?: { threatTypes?: unknown; expireTime?: unknown } };
      const threatTypes = Array.isArray(body.threat?.threatTypes) ? body.threat.threatTypes.filter((value): value is string => typeof value === 'string') : [];
      logSecurityEvent('provider_status', { provider: 'google_web_risk', status: 'found' });
      return {
        ...emptyResult(threatTypes.length > 0 ? 'FOUND' : 'NOT_FOUND', threatTypes.length > 0 ? undefined : 'No matching Google Web Risk threat was returned.'),
        queriedAt,
        threatTypes,
        expireTime: typeof body.threat?.expireTime === 'string' ? body.threat.expireTime : null,
        confidence: threatTypes.length > 0 ? 0.9 : null,
      };
    } catch (error) {
      const status = error instanceof Error && error.name === 'AbortError' ? 'UNAVAILABLE' : 'ERROR';
      logSecurityEvent('provider_status', { provider: 'google_web_risk', status: status.toLowerCase() });
      return { ...emptyResult(status, status === 'UNAVAILABLE' ? 'Google Web Risk is temporarily unavailable.' : 'Google Web Risk lookup failed.'), queriedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }
}
