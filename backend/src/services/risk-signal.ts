export type RiskSignalCategory =
  | 'TRANSPORT'
  | 'DOMAIN'
  | 'URL_STRUCTURE'
  | 'HOST'
  | 'ENCODING'
  | 'REDIRECT'
  | 'THREAT_INTELLIGENCE'
  | 'REPUTATION';

export type RiskSignalSource = 'LOCAL_ANALYSIS' | 'VIRUSTOTAL' | 'GOOGLE_WEB_RISK' | 'DNS' | 'RDAP' | 'TLS';
export type RiskSignalSeverity = 'low' | 'medium' | 'high';

export interface RiskSignal {
  id: string;
  category: RiskSignalCategory;
  source: RiskSignalSource;
  severity: RiskSignalSeverity;
  scoreContribution: number;
  title: string;
  description: string;
  evidence: string;
  confidence: number;
}