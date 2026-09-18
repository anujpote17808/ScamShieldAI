import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export interface ExternalThreatIntelligence {
  provider: string;
  status: "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED" | "ERROR";
  malicious: number | null;
  suspicious: number | null;
  harmless: number | null;
  undetected: number | null;
  timeout: number | null;
  reputation: number | null;
  categories: string[];
  detections: Array<{ engine: string; category: string; result: string }>;
  message?: string;
  queriedAt: string | null;
  lastAnalysisAt: string | null;
  confidence: number | null;
  threatTypes?: string[];
  expireTime?: string | null;
}

export interface ExternalThreatIntelligenceCollection {
  providers: ExternalThreatIntelligence[];
  externalProvidersAvailable: number;
  externalProvidersFound: number;
  agreement: boolean;
  conflicts: boolean;
}

export interface InfrastructureIntelligence {
  status: "COMPLETED" | "PARTIAL" | "UNAVAILABLE" | "ERROR" | "NOT_APPLICABLE";
  dns: { status: string; aRecords: string[]; aaaaRecords: string[]; cnameRecords: string[]; message?: string };
  registration: { status: string; domain?: string; registrar?: string; registrationDate?: string; expirationDate?: string; updatedDate?: string; statuses: string[]; nameservers: string[]; message?: string };
  tls: { status: string; subject?: string; issuer?: string; validFrom?: string; validTo?: string; hostnameMatch?: boolean; authorized?: boolean; message?: string };
  signals: Array<{ id: string; source: string; severity: string; scoreContribution: number; title: string; description: string; evidence: string; confidence: number }>;
  queriedAt: string;
}

export interface ScanResult {
  riskScore: number;
  riskLevel: string;
  classification: string;
  confidence: number;
  explanation: string;
  recommendation: string;
  analysis?: {
    hostname?: string;
    localScore?: number;
    verdict?: string;
    confidence?: number;
    evidenceQuality?: string;
    reasons?: Array<{ id: string; category: string; source: string; severity: string; scoreContribution: number; title: string; description: string; evidence: string; confidence: number }>;
    infrastructureIntelligence?: InfrastructureIntelligence;
    signals?: Array<{ id?: string; type: string; category?: string; source?: string; severity: string; points: number; scoreContribution?: number; message: string; title?: string; description?: string; evidence?: string; confidence?: number }>;
  };
  externalIntelligence?: ExternalThreatIntelligence | ExternalThreatIntelligenceCollection;
}

export interface ScanRecord {
  id: string;
  input: string;
  inputType: string;
  target?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  result?: ScanResult | null;
  indicators?: Array<{ indicator: string; description?: string | null }>;
}

export function useScans() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get<{ data: ScanRecord[] }>("/scans");
      setScans(response.data.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { scans, loading, error, refresh };
}
