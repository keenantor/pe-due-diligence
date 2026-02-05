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

const FINANCIAL_ANALYSIS_PROMPT = `You are a senior financial analyst specializing in Private Equity due diligence. Based on the information that public financial filings exist for this company, provide brief guidance.

Your analysis should include:

## Filing Availability
Confirm what type of filings are available and what this means.

## What These Filings Typically Contain
Brief overview of what information can be found in these filings.

## Due Diligence Recommendations
Key financial metrics to look for when reviewing the filings.

Guidelines:
- Be concise - this is just guidance on where to look
- Do NOT make up or estimate any financial numbers
- Direct the user to review the actual filings for specific data
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

    const prompt = `
Company: ${companyName}
Filing Source: ${financialData.source}
Company Type: ${financialData.companyType}
${financialData.ticker ? `Stock Ticker: ${financialData.ticker}` : ''}
${financialData.cik ? `SEC CIK: ${financialData.cik}` : ''}
${financialData.companyNumber ? `UK Company Number: ${financialData.companyNumber}` : ''}

Message: ${financialData.message}

Available Filings:
${financialData.filingLinks.slice(0, 3).map(f => `- ${f.name}`).join('\n')}

Please provide brief guidance on what to look for in these filings.
`.trim();

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: FINANCIAL_ANALYSIS_PROMPT },
        { role: 'user', content: prompt },
      ],
      maxTokens: 600,
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : null;
  } catch (error) {
    console.error('Mistral financial analysis error:', error);
    return null;
  }
}
