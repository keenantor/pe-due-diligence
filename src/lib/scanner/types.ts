// Signal represents a single data point that can be verified
export interface Signal {
  id: string;
  name: string;
  description: string;
  found: boolean;
  value?: string;
  source: string;
  category: SignalCategory;
  points: number;
  maxPoints: number;
}

export type SignalCategory =
  | 'identity'
  | 'leadership'
  | 'validation'
  | 'operational';

// Category score with breakdown
export interface CategoryScore {
  category: SignalCategory;
  name: string;
  score: number;
  maxScore: number;
  signals: Signal[];
  coverageLevel: CoverageLevel;
}

export type CoverageLevel = 'Excellent' | 'Good' | 'Moderate' | 'Limited' | 'Minimal' | 'None';

// Penalty applied for missing critical signals
export interface Penalty {
  id: string;
  name: string;
  description: string;
  points: number; // negative value
  applied: boolean;
  reason?: string;
}

// Effort estimate for completing full diligence
export interface EffortEstimate {
  level: 'Low' | 'Medium' | 'High';
  reasons: string[];
}

// Financial data from public filings
export interface FinancialData {
  available: boolean;
  source: 'SEC' | 'Companies House' | 'Public Filing' | 'None';
  companyType: 'Public US' | 'UK Company' | 'Private' | 'Unknown';
  records: FinancialRecord[];
  filingLinks: Array<{ name: string; url: string; date: string }>;
  ticker?: string;
  cik?: string;
  companyNumber?: string;
  message: string;
}

export interface FinancialRecord {
  source: string;
  sourceUrl: string;
  verified: boolean;
  period: string;
  description: string;
}

// Main scan result
export interface ScanResult {
  jobId: string;
  url: string;
  domain: string;
  companyName: string;
  score: number;
  coverageLevel: CoverageLevel;
  categories: CategoryScore[];
  penalties: Penalty[];
  totalPenalty: number;
  signals: Signal[];
  aiInterpretation?: string;
  financialData?: FinancialData;
  financialAnalysis?: string;
  effortEstimate: EffortEstimate;
  timestamp: string;
  duration: number;
}

// Scan request
export interface ScanRequest {
  url: string;
  includeAI?: boolean;
}

// Scan job status
export type ScanStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ScanJob {
  jobId: string;
  status: ScanStatus;
  progress: number;
  currentStep: string;
  result?: ScanResult;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Collector result from each data source
export interface CollectorResult {
  signals: Signal[];
  metadata: Record<string, unknown>;
  errors: CollectorError[];
  duration: number;
}

export interface CollectorError {
  code: string;
  message: string;
  recoverable: boolean;
}

// Collector context passed to each collector
export interface CollectorContext {
  url: string;
  domain: string;
  companyName?: string;
}

// Scoring configuration
export interface ScoringConfig {
  categories: {
    identity: { maxScore: 25 };
    leadership: { maxScore: 20 };
    validation: { maxScore: 25 };
    operational: { maxScore: 15 };
  };
  penalties: { maxPenalty: 15 };
  totalMaxScore: 100;
}

// Signal definitions for scoring
export interface SignalDefinition {
  id: string;
  name: string;
  description: string;
  category: SignalCategory;
  points: number;
  source: string;
}

// Coverage level thresholds
export const COVERAGE_THRESHOLDS = {
  Excellent: 85,
  Good: 70,
  Moderate: 50,
  Limited: 30,
  Minimal: 0,
} as const;

// Get coverage level from score
export function getCoverageLevel(score: number): CoverageLevel {
  if (score >= COVERAGE_THRESHOLDS.Excellent) return 'Excellent';
  if (score >= COVERAGE_THRESHOLDS.Good) return 'Good';
  if (score >= COVERAGE_THRESHOLDS.Moderate) return 'Moderate';
  if (score >= COVERAGE_THRESHOLDS.Limited) return 'Limited';
  return 'Minimal';
}

// Get effort estimate from score and missing signals
export function getEffortEstimate(score: number, missingSignals: Signal[]): EffortEstimate {
  const criticalMissing = missingSignals.filter(s => s.maxPoints >= 5);
  const reasons: string[] = [];

  if (criticalMissing.length > 0) {
    reasons.push(`${criticalMissing.length} critical signal(s) require manual verification`);
  }

  const missingByCategory = missingSignals.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (missingByCategory.leadership > 2) {
    reasons.push('Leadership information requires extensive research');
  }
  if (missingByCategory.validation > 3) {
    reasons.push('Limited external validation will require primary research');
  }
  if (missingByCategory.identity > 2) {
    reasons.push('Basic company identity needs verification');
  }

  if (score >= 70) {
    return { level: 'Low', reasons: reasons.length > 0 ? reasons : ['Standard validation of existing signals'] };
  }
  if (score >= 50) {
    return { level: 'Medium', reasons: reasons.length > 0 ? reasons : ['Moderate research needed for gaps'] };
  }
  return { level: 'High', reasons: reasons.length > 0 ? reasons : ['Extensive primary research required'] };
}
