import { Mistral } from '@mistralai/mistralai';
import { ScanResult, FinancialData } from '../types';
import { formatCurrency } from '../collectors/financials';

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
  const foundSignals = result.signals.filter((s) => s.found);
  const missingSignals = result.signals.filter((s) => !s.found);
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

const FINANCIAL_ANALYSIS_PROMPT = `You are a senior financial analyst specializing in Private Equity due diligence. Analyze the following verified public financial data and provide insights.

Your analysis should include:

## Financial Overview
Brief summary of the company's financial position based on the available data.

## Key Metrics Analysis
- Revenue analysis (if available): growth implications, scale
- Profitability assessment: margins, net income trends
- Balance sheet strength: asset base, leverage indicators

## Financial Health Indicators
- Positive indicators based on the data
- Areas of potential concern
- Metrics that need deeper investigation

## Comparable Context
How do these metrics compare to typical companies in this space? (provide general industry context)

## Due Diligence Recommendations
Specific financial areas that require further investigation during full diligence.

Guidelines:
- Only analyze the data provided - do not invent numbers
- Clearly state when making inferences vs. reporting facts
- Use professional financial terminology
- Do NOT make investment recommendations
- If data is limited, acknowledge this and focus on what IS available`;

export async function generateFinancialAnalysis(
  financialData: FinancialData,
  companyName: string
): Promise<string | null> {
  if (!MISTRAL_API_KEY) {
    console.warn('Mistral API key not configured');
    return null;
  }

  if (!financialData.available || financialData.records.length === 0) {
    return null;
  }

  try {
    const client = new Mistral({ apiKey: MISTRAL_API_KEY });

    const prompt = formatFinancialDataForAI(financialData, companyName);

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: FINANCIAL_ANALYSIS_PROMPT },
        { role: 'user', content: prompt },
      ],
      maxTokens: 1200,
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch (error) {
    console.error('Mistral financial analysis error:', error);
    return null;
  }
}

function formatFinancialDataForAI(data: FinancialData, companyName: string): string {
  const record = data.records[0];

  let metricsText = 'No detailed metrics available.';

  if (record?.metrics) {
    const m = record.metrics;
    const currency = record.currency || 'USD';

    const metricLines: string[] = [];
    if (m.revenue !== undefined) metricLines.push(`Revenue: ${formatCurrency(m.revenue, currency)}`);
    if (m.grossProfit !== undefined) metricLines.push(`Gross Profit: ${formatCurrency(m.grossProfit, currency)}`);
    if (m.operatingIncome !== undefined) metricLines.push(`Operating Income: ${formatCurrency(m.operatingIncome, currency)}`);
    if (m.netIncome !== undefined) metricLines.push(`Net Income: ${formatCurrency(m.netIncome, currency)}`);
    if (m.ebitda !== undefined) metricLines.push(`EBITDA: ${formatCurrency(m.ebitda, currency)}`);
    if (m.totalAssets !== undefined) metricLines.push(`Total Assets: ${formatCurrency(m.totalAssets, currency)}`);
    if (m.totalLiabilities !== undefined) metricLines.push(`Total Liabilities: ${formatCurrency(m.totalLiabilities, currency)}`);
    if (m.employees !== undefined) metricLines.push(`Employees: ${m.employees.toLocaleString()}`);

    if (metricLines.length > 0) {
      metricsText = metricLines.join('\n');
    }
  }

  return `
VERIFIED PUBLIC FINANCIAL DATA
==============================
Company: ${companyName}
Data Source: ${data.source} (${record?.verified ? 'Verified' : 'Unverified'})
Company Type: ${data.companyType}
${data.ticker ? `Stock Ticker: ${data.ticker}` : ''}
${data.cik ? `SEC CIK: ${data.cik}` : ''}
${data.companyNumber ? `UK Company Number: ${data.companyNumber}` : ''}

Reporting Period: ${record?.period || 'Unknown'}
Data Source URL: ${record?.sourceUrl || 'N/A'}

FINANCIAL METRICS:
${metricsText}

Please provide a professional financial analysis based on this verified data.
`.trim();
}
