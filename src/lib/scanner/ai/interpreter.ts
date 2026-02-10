import { Mistral } from '@mistralai/mistralai';
import { ScanResult, FinancialData } from '../types';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

const SYSTEM_PROMPT = `You are a senior Private Equity due diligence analyst. Your task is to provide a comprehensive pre-diligence interpretation based on automated scan results.

You must provide analysis in the following structured format:

## Executive Summary
A 2-3 sentence high-level overview of the company's public diligence coverage.

## Key Strengths
Bullet points highlighting the strongest aspects of their public presence and what this suggests about the company.

## Coverage Gaps
Bullet points identifying missing signals and what additional verification will be needed.

## Industry & Market Context
Based on what you can infer from the company name, domain, and detected technologies:
- What industry/sector does this company likely operate in?
- What type of business model might they have (B2B SaaS, marketplace, e-commerce, etc.)?
- Who are potential competitors or comparable companies?
- What market trends are relevant to this space?

## Risk Indicators
Note any red flags or areas of concern based on:
- Missing leadership information
- Limited external validation
- New domain age
- Lack of social presence

## Recommended Diligence Focus
Prioritized list of areas that should receive the most attention during full diligence, based on the gaps identified.

## Additional Research Notes
Any other relevant observations or context that would be valuable for a PE analyst preparing for diligence.

Guidelines:
- Be analytical and insightful, not just descriptive
- Draw reasonable inferences but clearly label speculation
- Use professional, institutional language
- Be specific about what the data shows vs. what requires verification
- Do NOT make investment recommendations
- Format with proper markdown headers and bullet points`;

export async function generateAIInterpretation(
  scanResult: ScanResult
): Promise<string | null> {
  if (!MISTRAL_API_KEY) {
    console.warn('Mistral API key not configured');
    return null;
  }

  try {
    const client = new Mistral({ apiKey: MISTRAL_API_KEY });

    const prompt = formatScanResultForAI(scanResult);

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1500,
      temperature: 0.4,
    });

    const content = response.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch (error) {
    console.error('Mistral API error:', error);
    return null;
  }
}

function formatScanResultForAI(result: ScanResult): string {
  const appliedPenalties = result.penalties.filter((p) => p.applied);

  // Group signals by category for better context
  const signalsByCategory = result.categories.map((cat) => ({
    name: cat.name,
    coverage: cat.coverageLevel,
    score: `${cat.score}/${cat.maxScore}`,
    found: cat.signals.filter((s) => s.found).map((s) => `${s.name}${s.value ? ` (${s.value})` : ''}`),
    missing: cat.signals.filter((s) => !s.found).map((s) => s.name),
  }));

  return `
COMPANY SCAN RESULTS
====================
Company Name: ${result.companyName}
Domain: ${result.domain}
Website URL: ${result.url}

OVERALL SCORE: ${result.score}/100 - ${result.coverageLevel} Coverage
Estimated Diligence Effort: ${result.effortEstimate.level}

CATEGORY BREAKDOWN:
${signalsByCategory.map((cat) => `
${cat.name} (${cat.score} - ${cat.coverage}):
  Found: ${cat.found.length > 0 ? cat.found.join(', ') : 'None'}
  Missing: ${cat.missing.length > 0 ? cat.missing.join(', ') : 'None'}
`).join('')}

RISK PENALTIES APPLIED:
${appliedPenalties.length > 0
  ? appliedPenalties.map((p) => `- ${p.name}: ${p.reason || p.description} (${p.points} pts)`).join('\n')
  : 'None'}

EFFORT FACTORS:
${result.effortEstimate.reasons.map((r) => `- ${r}`).join('\n')}

Please provide a comprehensive pre-diligence interpretation following the structured format specified.
`.trim();
}

const FINANCIAL_ANALYSIS_PROMPT = `You are a senior financial analyst specializing in Private Equity due diligence. Analyze the provided financial metrics and give comprehensive insights.

Your analysis should include:

## Financial Overview
Summarize the key financial metrics. Comment on the scale of the business and its position in the market.

## Profitability & Margins Analysis
Analyze the margin profile:
- Gross margin, operating margin, net margin, EBITDA margin
- Compare to typical industry benchmarks if relevant
- Comment on profitability trends

## Cash Flow Health
Evaluate cash generation capabilities:
- Operating cash flow quality
- Free cash flow generation
- Capital expenditure requirements

## Balance Sheet & Leverage
Comment on financial stability:
- Debt-to-equity ratio
- Current ratio (liquidity)
- Asset composition

## Return Metrics
Analyze capital efficiency:
- Return on Equity (ROE)
- Return on Assets (ROA)
- What these suggest about management effectiveness

## Growth Trajectory
If historical data is available:
- Revenue growth trends
- Earnings growth patterns
- Sustainability of growth

## Key Observations
3-5 bullet points on notable aspects (positive or concerning).

## Due Diligence Recommendations
Prioritized areas requiring verification during full diligence.

Guidelines:
- Use the ACTUAL numbers provided - do not make up data
- Be analytical and specific, not generic
- Reference specific metrics when making observations
- Keep it concise (under 600 words)
- Do NOT make investment recommendations`;

export async function generateFinancialAnalysis(
  financialData: FinancialData,
  companyName: string
): Promise<string | null> {
  if (!MISTRAL_API_KEY) {
    console.warn('Mistral API key not configured');
    return null;
  }

  if (!financialData.available) {
    return null;
  }

  try {
    const client = new Mistral({ apiKey: MISTRAL_API_KEY });

    const metrics = financialData.metrics;

    // Format helpers
    const formatNum = (n: number | undefined): string => {
      if (n === undefined) return 'N/A';
      const absN = Math.abs(n);
      const sign = n < 0 ? '-' : '';
      if (absN >= 1e9) return `${sign}$${(absN / 1e9).toFixed(2)}B`;
      if (absN >= 1e6) return `${sign}$${(absN / 1e6).toFixed(2)}M`;
      if (absN >= 1e3) return `${sign}$${(absN / 1e3).toFixed(2)}K`;
      return `${sign}$${absN.toLocaleString()}`;
    };

    const formatPct = (n: number | undefined): string => {
      if (n === undefined) return 'N/A';
      return `${(n * 100).toFixed(1)}%`;
    };

    const formatRatio = (n: number | undefined): string => {
      if (n === undefined) return 'N/A';
      return n.toFixed(2);
    };

    // Build historical summary if available
    let historicalSummary = '';
    if (metrics?.historicalRevenue && metrics.historicalRevenue.length > 1) {
      historicalSummary = `
HISTORICAL REVENUE (${metrics.historicalRevenue.length} Years):
${metrics.historicalRevenue.map(h => `${h.year}: ${formatNum(h.value)}`).join('\n')}`;
    }

    const prompt = `
Company: ${companyName}
Stock Ticker: ${financialData.ticker || 'N/A'}
Company Type: ${financialData.companyType}
Data Source: ${financialData.source === 'SEC' ? 'Financial Modeling Prep (verified SEC filings)' : financialData.source}
Fiscal Year: ${metrics?.fiscalYear || 'Latest'}

INCOME METRICS:
Revenue: ${formatNum(metrics?.revenue)}
Gross Profit: ${formatNum(metrics?.grossProfit)}
Operating Income: ${formatNum(metrics?.operatingIncome)}
EBITDA: ${formatNum(metrics?.ebitda)}
Net Income: ${formatNum(metrics?.netIncome)}
EPS: ${metrics?.eps !== undefined ? `$${metrics.eps.toFixed(2)}` : 'N/A'}

CASH FLOW:
Operating Cash Flow: ${formatNum(metrics?.operatingCashFlow)}
Free Cash Flow: ${formatNum(metrics?.freeCashFlow)}
Capital Expenditures: ${formatNum(metrics?.capitalExpenditures)}

BALANCE SHEET:
Total Assets: ${formatNum(metrics?.totalAssets)}
Total Liabilities: ${formatNum(metrics?.totalLiabilities)}
Shareholders' Equity: ${formatNum(metrics?.totalEquity)}
Total Debt: ${formatNum(metrics?.totalDebt)}

PROFITABILITY RATIOS:
Gross Margin: ${formatPct(metrics?.ratios?.grossMargin)}
Operating Margin: ${formatPct(metrics?.ratios?.operatingMargin)}
Net Margin: ${formatPct(metrics?.ratios?.netMargin)}
EBITDA Margin: ${formatPct(metrics?.ratios?.ebitdaMargin)}

RETURN METRICS:
Return on Equity (ROE): ${formatPct(metrics?.ratios?.returnOnEquity)}
Return on Assets (ROA): ${formatPct(metrics?.ratios?.returnOnAssets)}

LEVERAGE & LIQUIDITY:
Debt to Equity: ${formatRatio(metrics?.ratios?.debtToEquity)}x
Current Ratio: ${formatRatio(metrics?.ratios?.currentRatio)}x

GROWTH (YoY):
Revenue Growth: ${formatPct(metrics?.growth?.revenueGrowthYoY)}
Net Income Growth: ${formatPct(metrics?.growth?.netIncomeGrowthYoY)}
EPS Growth: ${formatPct(metrics?.growth?.epsGrowthYoY)}
${historicalSummary}

Please analyze these financial metrics and provide comprehensive insights for PE due diligence.
`.trim();

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: FINANCIAL_ANALYSIS_PROMPT },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1000,
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch (error) {
    console.error('Mistral financial analysis error:', error);
    return null;
  }
}
