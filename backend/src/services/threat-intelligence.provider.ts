export type ThreatIntelStatus = 'FOUND' | 'NOT_FOUND' | 'UNAVAILABLE' | 'RATE_LIMITED' | 'ERROR';

export interface ExternalThreatIntelligence {
  provider: string;
  status: ThreatIntelStatus;
  malicious: number | null;
  suspicious: number | null;
  harmless: number | null;
  undetected: number | null;
  timeout: number | null;
  reputation: number | null;
  categories: string[];
  detections: Array<{ engine: string; category: string; result: string }>;
  queriedAt: string | null;
  lastAnalysisAt: string | null;
  confidence: number | null;
  threatTypes?: string[];
  expireTime?: string | null;
  message?: string;
}

export interface ExternalThreatIntelligenceCollection {
  providers: ExternalThreatIntelligence[];
  externalProvidersAvailable: number;
  externalProvidersFound: number;
  agreement: boolean;
  conflicts: boolean;
}

export interface ThreatIntelligenceProvider {
  lookupUrl(url: string): Promise<ExternalThreatIntelligence>;
  getStatus(): { provider: string; configured: boolean };
}
