import net from 'node:net';
import { URL } from 'node:url';
import { RiskSignal, RiskSignalCategory } from './risk-signal';

export type SignalSeverity = 'low' | 'medium' | 'high';

export interface UrlSignal extends RiskSignal {
  type: string;
  points: number;
  message: string;
}

export interface UrlAnalysisResult {
  normalizedUrl: string;
  hostname: string;
  riskScore: number;
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  signals: UrlSignal[];
  explanation: string;
  recommendation: string;
}

const allowedProtocols = new Set(['http:', 'https:']);
const suspiciousKeywords = /(?:login|signin|verify|account|secure|update|wallet|gift|prize|free|claim)/i;
const suspiciousQueryKeys = new Set(['redirect', 'url', 'return', 'next', 'token', 'verify', 'login', 'continue']);

export function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
    || parts[0] >= 224
  );
}

export function isBlockedIpAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');
  const version = net.isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version !== 6) return false;
  const dottedMappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const hexMappedIpv4 = normalized.match(/(?:^|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  const mappedIpv4 = dottedMappedIpv4 || (hexMappedIpv4
    ? [Number.parseInt(hexMappedIpv4[1], 16) >> 8, Number.parseInt(hexMappedIpv4[1], 16) & 255, Number.parseInt(hexMappedIpv4[2], 16) >> 8, Number.parseInt(hexMappedIpv4[2], 16) & 255].join('.')
    : undefined);
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized.startsWith('ff') || Boolean(mappedIpv4 && isPrivateIpv4(mappedIpv4));
}

export function isBlockedHostname(hostname: string) {
  const lowerHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  return lowerHostname === 'localhost' ||
    lowerHostname.endsWith('.localhost') ||
    lowerHostname.endsWith('.local') ||
    lowerHostname.endsWith('.internal') ||
    (!lowerHostname.includes('.') && net.isIP(lowerHostname) === 0) ||
    lowerHostname === 'metadata.google.internal' ||
    isBlockedIpAddress(lowerHostname);
}

function categoryFor(type: string): RiskSignalCategory {
  if (type.includes('transport')) return 'TRANSPORT';
  if (type.includes('subdomain') || type.includes('punycode') || type.includes('keyword')) return 'DOMAIN';
  if (type.includes('ip_') || type.includes('port')) return 'HOST';
  if (type.includes('encoded')) return 'ENCODING';
  if (type.includes('redirect') || type.includes('tracking')) return 'REDIRECT';
  return 'URL_STRUCTURE';
}

function addSignal(signals: UrlSignal[], signal: Pick<UrlSignal, 'type' | 'severity' | 'points' | 'message'>) {
  const id = signal.type;
  const title = signal.message.split('.')[0];
  signals.push({
    ...signal,
    id,
    category: categoryFor(signal.type),
    source: 'LOCAL_ANALYSIS',
    scoreContribution: signal.points,
    title,
    description: signal.message,
    evidence: signal.message,
    confidence: signal.severity === 'high' ? 0.9 : signal.severity === 'medium' ? 0.75 : 0.65,
  });
}

export function analyzeUrl(rawUrl: string): UrlAnalysisResult {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) throw { statusCode: 400, code: 'INVALID_URL', message: 'A URL is required' };
  if (trimmedUrl.length > 2048) throw { statusCode: 400, code: 'INVALID_URL', message: 'URL exceeds the 2048 character limit' };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw { statusCode: 400, code: 'INVALID_URL', message: 'Enter a complete, valid URL' };
  }

  if (!allowedProtocols.has(parsedUrl.protocol)) {
    throw { statusCode: 400, code: 'UNSUPPORTED_PROTOCOL', message: 'Only HTTP and HTTPS URLs are supported' };
  }
  if (!parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
    throw { statusCode: 400, code: 'INVALID_URL', message: 'URL must include a hostname and cannot contain embedded credentials' };
  }
  if (isBlockedHostname(parsedUrl.hostname)) {
    throw { statusCode: 400, code: 'UNSAFE_TARGET', message: 'Private and internal network targets cannot be scanned' };
  }

  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
  const signals: UrlSignal[] = [];
  const hostname = parsedUrl.hostname;
  const hostnameLabels = hostname.split('.');
  const normalizedUrl = parsedUrl.toString();
  const ipVersion = net.isIP(hostname);

  if (parsedUrl.protocol === 'http:') addSignal(signals, { type: 'insecure_transport', severity: 'medium', points: 20, message: 'The URL uses HTTP instead of encrypted HTTPS transport.' });
  if (parsedUrl.protocol === 'https:') addSignal(signals, { type: 'https_transport', severity: 'low', points: 0, message: 'The URL uses HTTPS transport.' });
  if (ipVersion) addSignal(signals, { type: 'ip_address_host', severity: 'high', points: 35, message: 'The hostname is a raw IP address rather than a registered domain.' });
  if (hostname.includes('xn--')) addSignal(signals, { type: 'punycode_hostname', severity: 'high', points: 25, message: 'The hostname contains punycode, which can represent look-alike internationalized domains.' });
  if (hostnameLabels.length > 4) addSignal(signals, { type: 'deep_subdomain', severity: 'medium', points: 15, message: 'The hostname contains an unusually deep subdomain structure.' });
  else if (hostnameLabels.length > 3) addSignal(signals, { type: 'deep_subdomain', severity: 'low', points: 8, message: 'The hostname contains multiple nested subdomains.' });
  if (normalizedUrl.length > 250) addSignal(signals, { type: 'long_url', severity: 'medium', points: 15, message: 'The URL is unusually long and may conceal its final destination.' });
  else if (normalizedUrl.length > 140) addSignal(signals, { type: 'long_url', severity: 'low', points: 8, message: 'The URL is longer than typical web links.' });
  if (/%[0-9a-f]{2}/i.test(normalizedUrl)) addSignal(signals, { type: 'encoded_components', severity: 'medium', points: 10, message: 'The URL contains encoded components that make its structure harder to inspect.' });
  if (parsedUrl.port && !['80', '443'].includes(parsedUrl.port)) addSignal(signals, { type: 'unusual_port', severity: 'medium', points: 15, message: `The URL uses the non-standard port ${parsedUrl.port}.` });
  if (suspiciousKeywords.test(`${hostname}${parsedUrl.pathname}`)) addSignal(signals, { type: 'suspicious_keyword', severity: 'medium', points: 12, message: 'The hostname or path contains words commonly used in credential or prize lures.' });

  const queryKeys = [...parsedUrl.searchParams.keys()].map((key) => key.toLowerCase());
  const suspiciousKeys = queryKeys.filter((key) => suspiciousQueryKeys.has(key));
  if (suspiciousKeys.length > 0) addSignal(signals, { type: 'redirect_or_tracking_parameter', severity: 'medium', points: Math.min(15, suspiciousKeys.length * 5), message: 'The query string contains redirect, verification, or tracking parameters.' });

  const riskScore = Math.min(100, signals.reduce((total, signal) => total + signal.points, 0));
  // Deterministic thresholds: 0-19 SAFE, 20-44 SUSPICIOUS, 45-100 DANGEROUS.
  const verdict = riskScore >= 45 ? 'DANGEROUS' : riskScore >= 20 ? 'SUSPICIOUS' : 'SAFE';
  const explanation = signals.length === 0
    ? 'No structural risk signals were detected in this URL. This heuristic result does not guarantee that the destination is safe.'
    : `${signals.filter((signal) => signal.points > 0).length} structural risk signal(s) contributed to this result. This heuristic result does not confirm malicious content.`;
  const recommendation = verdict === 'DANGEROUS'
    ? 'Do not open the link or submit information. Verify the destination through an official channel.'
    : verdict === 'SUSPICIOUS'
      ? 'Use caution and verify the destination independently before opening it.'
      : 'No structural concerns were detected. Continue to verify the sender and context.';

  return { normalizedUrl, hostname, riskScore, verdict, signals, explanation, recommendation };
}
