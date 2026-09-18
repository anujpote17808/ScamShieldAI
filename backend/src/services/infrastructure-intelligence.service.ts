import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import { isBlockedHostname, isBlockedIpAddress } from './url-analysis.service';
import { RiskSignal } from './risk-signal';

const OPERATION_TIMEOUT_MS = 4000;
const RDAP_ENDPOINT = 'https://rdap.org/domain/';

type InfrastructureStatus = 'COMPLETED' | 'PARTIAL' | 'UNAVAILABLE' | 'ERROR' | 'NOT_APPLICABLE';

export interface InfrastructureIntelligence {
  status: InfrastructureStatus;
  dns: { status: string; aRecords: string[]; aaaaRecords: string[]; cnameRecords: string[]; message?: string };
  registration: { status: string; domain?: string; registrar?: string; registrationDate?: string; expirationDate?: string; updatedDate?: string; statuses: string[]; nameservers: string[]; message?: string };
  tls: { status: string; subject?: string; issuer?: string; validFrom?: string; validTo?: string; hostnameMatch?: boolean; authorized?: boolean; message?: string };
  signals: RiskSignal[];
  queriedAt: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = OPERATION_TIMEOUT_MS): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))]);
}

function isBlockedAddress(address: string) {
  return isBlockedIpAddress(address);
}

function signal(id: string, source: RiskSignal['source'], severity: RiskSignal['severity'], scoreContribution: number, title: string, description: string, evidence: string): RiskSignal {
  return { id, source, category: source === 'TLS' ? 'TRANSPORT' : 'HOST', severity, scoreContribution, title, description, evidence, confidence: scoreContribution > 0 ? 0.85 : 0.65 };
}

async function resolveDomain(hostname: string) {
  const [a, aaaa, cname] = await Promise.allSettled([
    withTimeout(dns.resolve4(hostname)),
    withTimeout(dns.resolve6(hostname)),
    withTimeout(dns.resolveCname(hostname)),
  ]);
  const aRecords = a.status === 'fulfilled' ? a.value : [];
  const aaaaRecords = aaaa.status === 'fulfilled' ? aaaa.value : [];
  const cnameRecords = cname.status === 'fulfilled' ? cname.value : [];
  const resolvedAddresses = [...aRecords, ...aaaaRecords];
  const blocked = resolvedAddresses.some(isBlockedAddress);
  return { status: resolvedAddresses.length > 0 && !blocked ? 'COMPLETED' : 'ERROR', aRecords, aaaaRecords, cnameRecords, resolvedAddresses, blocked };
}

function parseRdap(body: unknown, hostname: string) {
  const data = body as { ldhName?: unknown; status?: unknown; nameservers?: Array<{ ldhName?: unknown }>; events?: Array<{ eventAction?: unknown; eventDate?: unknown }>; entities?: Array<{ roles?: unknown; vcardArray?: unknown[] }> };
  const event = (action: string) => data.events?.find((item) => item.eventAction === action)?.eventDate;
  const registrarEntity = data.entities?.find((entity) => Array.isArray(entity.roles) && entity.roles.includes('registrar'));
  const vcard = Array.isArray(registrarEntity?.vcardArray?.[1]) ? registrarEntity?.vcardArray?.[1] as Array<[string, unknown, unknown, unknown]> : [];
  const registrar = vcard.find((item) => item[0] === 'fn' || item[0] === 'org')?.[3];
  return {
    status: 'COMPLETED',
    domain: typeof data.ldhName === 'string' ? data.ldhName : hostname,
    ...(typeof registrar === 'string' ? { registrar } : {}),
    ...(typeof event('registration') === 'string' ? { registrationDate: event('registration') } : {}),
    ...(typeof event('expiration') === 'string' ? { expirationDate: event('expiration') } : {}),
    ...(typeof event('last changed') === 'string' ? { updatedDate: event('last changed') } : {}),
    statuses: Array.isArray(data.status) ? data.status.filter((value): value is string => typeof value === 'string') : [],
    nameservers: Array.isArray(data.nameservers) ? data.nameservers.map((server) => server.ldhName).filter((value): value is string => typeof value === 'string') : [],
  };
}

async function lookupRegistration(hostname: string) {
  if (net.isIP(hostname) || !hostname.includes('.')) return { status: 'UNAVAILABLE', statuses: [], nameservers: [], message: 'Registration lookup is not available for this host.' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPERATION_TIMEOUT_MS);
  try {
    const response = await fetch(`${RDAP_ENDPOINT}${encodeURIComponent(hostname)}`, { redirect: 'manual', signal: controller.signal, headers: { accept: 'application/rdap+json, application/json' } });
    if (!response.ok || response.status >= 300) return { status: 'UNAVAILABLE', statuses: [], nameservers: [], message: 'Registration intelligence unavailable.' };
    return parseRdap(await response.json(), hostname);
  } catch {
    return { status: 'UNAVAILABLE', statuses: [], nameservers: [], message: 'Registration intelligence unavailable.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectTls(hostname: string, address: string | undefined, enabled: boolean) {
  if (!enabled) return { status: 'NOT_APPLICABLE', message: 'TLS intelligence is not applicable to this URL.' };
  if (!address) return { status: 'UNAVAILABLE', message: 'TLS inspection requires a public DNS address.' };
  return new Promise<Record<string, unknown>>((resolve) => {
    const socket = tls.connect({ host: address, port: 443, servername: hostname, rejectUnauthorized: false, timeout: OPERATION_TIMEOUT_MS }, () => {
      const certificate = socket.getPeerCertificate();
      const identityError = tls.checkServerIdentity(hostname, certificate);
      const authorized = socket.authorized;
      socket.end();
      resolve({ status: 'COMPLETED', subject: certificate.subject?.CN, issuer: certificate.issuer?.CN, validFrom: certificate.valid_from, validTo: certificate.valid_to, hostnameMatch: !identityError, authorized, ...(identityError ? { message: 'Certificate hostname does not match the target.' } : {}) });
    });
    const fail = (message: string) => { socket.destroy(); resolve({ status: 'ERROR', message }); };
    socket.once('timeout', () => fail('TLS inspection timed out.'));
    socket.once('error', () => fail('TLS inspection failed.'));
  });
}

export async function inspectInfrastructure(url: string, hostname: string): Promise<InfrastructureIntelligence> {
  const queriedAt = new Date().toISOString();
  if (isBlockedHostname(hostname)) {
    return { status: 'ERROR', dns: { status: 'ERROR', aRecords: [], aaaaRecords: [], cnameRecords: [], message: 'Internal targets are not eligible for infrastructure inspection.' }, registration: { status: 'UNAVAILABLE', statuses: [], nameservers: [] }, tls: { status: 'UNAVAILABLE', message: 'Internal targets are not eligible for TLS inspection.' }, signals: [], queriedAt };
  }

  const parsed = new URL(url);
  const dnsResult = await resolveDomain(hostname);
  const dnsSignals: RiskSignal[] = [];
  if (dnsResult.blocked) dnsSignals.push(signal('dns-private-resolution', 'DNS', 'high', 0, 'Resolved address is private', 'DNS resolved the hostname to a private or internal address, so infrastructure connections were refused.', dnsResult.aRecords.concat(dnsResult.aaaaRecords).join(', ')));
  if (dnsResult.resolvedAddresses?.length === 0) dnsSignals.push(signal('dns-resolution-failed', 'DNS', 'low', 0, 'DNS resolution failed', 'No public A or AAAA address was returned for the hostname.', hostname));
  const [registration, tlsInfo] = await Promise.all([lookupRegistration(hostname), inspectTls(hostname, dnsResult.aRecords[0] || dnsResult.aaaaRecords[0], parsed.protocol === 'https:')]);
  const tlsSignals: RiskSignal[] = [];
  if (tlsInfo.status === 'COMPLETED') {
    if (tlsInfo.hostnameMatch === false) tlsSignals.push(signal('tls-hostname-mismatch', 'TLS', 'high', 25, 'TLS hostname mismatch', 'The certificate identity does not match the requested hostname.', hostname));
    if (tlsInfo.authorized === false) tlsSignals.push(signal('tls-not-authorized', 'TLS', 'medium', 15, 'TLS certificate is not authorized', 'The TLS socket did not validate the certificate chain.', String(tlsInfo.message || 'authorized=false')));
    if (typeof tlsInfo.validTo === 'string' && new Date(tlsInfo.validTo).getTime() < Date.now()) tlsSignals.push(signal('tls-expired', 'TLS', 'high', 25, 'TLS certificate expired', 'The certificate validity period has ended.', tlsInfo.validTo));
  }
  const completed = dnsResult.status === 'COMPLETED' && registration.status === 'COMPLETED' && (tlsInfo.status === 'COMPLETED' || tlsInfo.status === 'NOT_APPLICABLE');
  return { status: completed ? 'COMPLETED' : 'PARTIAL', dns: { status: dnsResult.status, aRecords: dnsResult.aRecords, aaaaRecords: dnsResult.aaaaRecords, cnameRecords: dnsResult.cnameRecords, ...(dnsResult.blocked ? { message: 'Resolved private address rejected.' } : {}) }, registration, tls: tlsInfo, signals: [...dnsSignals, ...tlsSignals], queriedAt } as InfrastructureIntelligence;
}
