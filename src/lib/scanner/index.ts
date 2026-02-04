import {
  ScanResult,
  Signal,
  CategoryScore,
  Penalty,
  CollectorContext,
  getCoverageLevel,
  getEffortEstimate,
  FinancialData,
} from './types';
import { SIGNAL_DEFINITIONS, PENALTY_DEFINITIONS, CATEGORY_INFO } from './constants';
import { extractDomain, domainToCompanyName, generateJobId } from '@/lib/utils/url';
import { collectWebsiteSignals } from './collectors/website';
import { collectDomainSignals } from './collectors/domain';
import { collectSearchSignals } from './collectors/search';
import { collectLinkedInSignals } from './collectors/linkedin';
import { collectCareersSignals } from './collectors/careers';
import { collectTechStackSignals } from './collectors/techstack';
import { collectFinancialSignals } from './collectors/financials';
import { generateAIInterpretation, generateFinancialAnalysis } from './ai/interpreter';

export interface ScanOptions {
  url: string;
  includeAI?: boolean;
  onProgress?: (progress: number, step: string) => void;
}

export async function runScan(options: ScanOptions): Promise<ScanResult> {
  const { url, onProgress } = options;
  const startTime = Date.now();
  const jobId = generateJobId();

  const domain = extractDomain(url);
  let companyName = domainToCompanyName(domain);

  const context: CollectorContext = {
    url,
    domain,
    companyName,
  };

  // Collect signals from all sources
  const allSignals: Signal[] = [];
  const errors: Array<{ collector: string; error: string }> = [];

  // Step 1: Website crawling (runs first to get company name)
  onProgress?.(10, 'Checking website...');
  try {
    const websiteResult = await collectWebsiteSignals(context);
    allSignals.push(...websiteResult.signals);
    if (websiteResult.metadata.companyName) {
      companyName = websiteResult.metadata.companyName as string;
      context.companyName = companyName;
    }
  } catch (e) {
    errors.push({ collector: 'website', error: String(e) });
  }

  // Step 2: Run all other collectors IN PARALLEL for speed
  onProgress?.(30, 'Analyzing company data...');

  let financialData: FinancialData | undefined;

  const [domainResult, searchResult, linkedInResult, careersResult, techResult, financialResult] =
    await Promise.allSettled([
      collectDomainSignals(context),
      collectSearchSignals(context),
      collectLinkedInSignals(context),
      collectCareersSignals(context),
      collectTechStackSignals(context),
      collectFinancialSignals(context),
    ]);

  // Process domain result
  if (domainResult.status === 'fulfilled') {
    allSignals.push(...domainResult.value.signals);
  } else {
    errors.push({ collector: 'domain', error: String(domainResult.reason) });
  }

  // Process search result
  if (searchResult.status === 'fulfilled') {
    allSignals.push(...searchResult.value.signals);
  } else {
    errors.push({ collector: 'search', error: String(searchResult.reason) });
  }

  // Process LinkedIn result
  if (linkedInResult.status === 'fulfilled') {
    allSignals.push(...linkedInResult.value.signals);
  } else {
    errors.push({ collector: 'linkedin', error: String(linkedInResult.reason) });
  }

  // Process careers result
  if (careersResult.status === 'fulfilled') {
    allSignals.push(...careersResult.value.signals);
  } else {
    errors.push({ collector: 'careers', error: String(careersResult.reason) });
  }

  // Process tech stack result
  if (techResult.status === 'fulfilled') {
    allSignals.push(...techResult.value.signals);
  } else {
    errors.push({ collector: 'techstack', error: String(techResult.reason) });
  }

  // Process financial result
  if (financialResult.status === 'fulfilled' && financialResult.value.financialData.available) {
    financialData = financialResult.value.financialData;
  } else if (financialResult.status === 'rejected') {
    errors.push({ collector: 'financials', error: String(financialResult.reason) });
  }

  onProgress?.(85, 'Calculating score...');

  // Merge collected signals with definitions
  const signals = mergeSignalsWithDefinitions(allSignals);

  // Calculate category scores
  const categories = calculateCategoryScores(signals);

  // Calculate penalties
  const { penalties, totalPenalty } = calculatePenalties(signals, categories);

  // Calculate total score
  const categoryTotal = categories.reduce((sum, c) => sum + c.score, 0);
  const score = Math.max(0, Math.min(100, categoryTotal + totalPenalty));
  const coverageLevel = getCoverageLevel(score);

  // Calculate effort estimate
  const missingSignals = signals.filter((s) => !s.found);
  const effortEstimate = getEffortEstimate(score, missingSignals);

  // Build preliminary result for AI
  const preliminaryResult: ScanResult = {
    jobId,
    url,
    domain,
    companyName,
    score,
    coverageLevel,
    categories,
    penalties,
    totalPenalty,
    signals,
    financialData,
    effortEstimate,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };

  // Generate AI interpretation and financial analysis IN PARALLEL
  onProgress?.(90, 'Generating AI analysis...');
  let aiInterpretation: string | undefined;
  let financialAnalysis: string | undefined;

  const aiPromises: Promise<string | null>[] = [generateAIInterpretation(preliminaryResult)];

  if (financialData?.available && financialData.records.length > 0) {
    aiPromises.push(generateFinancialAnalysis(financialData, companyName));
  }

  const [interpretationResult, financialResult2] = await Promise.allSettled(aiPromises);

  if (interpretationResult.status === 'fulfilled' && interpretationResult.value) {
    aiInterpretation = interpretationResult.value;
  }

  if (financialResult2?.status === 'fulfilled' && financialResult2.value) {
    financialAnalysis = financialResult2.value;
  }

  onProgress?.(100, 'Complete');

  return {
    ...preliminaryResult,
    aiInterpretation,
    financialAnalysis,
    duration: Date.now() - startTime,
  };
}

function mergeSignalsWithDefinitions(collectedSignals: Signal[]): Signal[] {
  const signalMap = new Map(collectedSignals.map((s) => [s.id, s]));

  return SIGNAL_DEFINITIONS.map((def) => {
    const collected = signalMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      points: collected?.found ? def.points : 0,
      maxPoints: def.points,
      found: collected?.found ?? false,
      value: collected?.value,
      source: def.source,
    };
  });
}

function calculateCategoryScores(signals: Signal[]): CategoryScore[] {
  const categories = ['identity', 'leadership', 'validation', 'operational'] as const;

  return categories.map((category) => {
    const categorySignals = signals.filter((s) => s.category === category);
    const score = categorySignals.reduce((sum, s) => sum + s.points, 0);
    const maxScore = CATEGORY_INFO[category].maxScore;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    let coverageLevel: CategoryScore['coverageLevel'];
    if (percentage >= 85) coverageLevel = 'Excellent';
    else if (percentage >= 70) coverageLevel = 'Good';
    else if (percentage >= 50) coverageLevel = 'Moderate';
    else if (percentage >= 30) coverageLevel = 'Limited';
    else if (percentage > 0) coverageLevel = 'Minimal';
    else coverageLevel = 'None';

    return {
      category,
      name: CATEGORY_INFO[category].name,
      score,
      maxScore,
      signals: categorySignals,
      coverageLevel,
    };
  });
}

function calculatePenalties(
  signals: Signal[],
  categories: CategoryScore[]
): { penalties: Penalty[]; totalPenalty: number } {
  const penalties: Penalty[] = [];

  // No leadership identifiable
  const leadershipCategory = categories.find((c) => c.category === 'leadership');
  const leadershipScore = leadershipCategory?.score ?? 0;
  const noLeadership = leadershipScore < 6;
  penalties.push({
    id: 'no_leadership',
    name: 'No Leadership Identifiable',
    description: 'No founders, team page, or LinkedIn leaders found',
    points: -5,
    applied: noLeadership,
    reason: noLeadership ? 'Leadership category score below threshold' : undefined,
  });

  // Website-only footprint
  const thirdPartySignal = signals.find((s) => s.id === 'third_party_mentions');
  const newsSignal = signals.find((s) => s.id === 'news_coverage');
  const websiteOnly = !thirdPartySignal?.found && !newsSignal?.found;
  penalties.push({
    id: 'website_only',
    name: 'Website-Only Footprint',
    description: 'No third-party mentions detected',
    points: -5,
    applied: websiteOnly,
    reason: websiteOnly ? 'No external validation signals found' : undefined,
  });

  // No social presence
  const linkedInSignal = signals.find((s) => s.id === 'linkedin_company');
  const noSocial = !linkedInSignal?.found;
  penalties.push({
    id: 'no_social',
    name: 'No Social Presence',
    description: 'No LinkedIn or social profiles found',
    points: -3,
    applied: noSocial,
    reason: noSocial ? 'LinkedIn company page not found' : undefined,
  });

  // New domain
  const domainAgeSignal = signals.find((s) => s.id === 'domain_age');
  const newDomain = domainAgeSignal?.found === false && (domainAgeSignal?.value?.includes('< 1') ?? false);
  penalties.push({
    id: 'new_domain',
    name: 'Very New Domain',
    description: 'Domain less than 1 year old',
    points: -2,
    applied: newDomain,
    reason: newDomain ? domainAgeSignal?.value : undefined,
  });

  const totalPenalty = penalties
    .filter((p) => p.applied)
    .reduce((sum, p) => sum + p.points, 0);

  return { penalties, totalPenalty };
}
