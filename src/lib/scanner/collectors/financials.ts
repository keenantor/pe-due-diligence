import { CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export interface FinancialRecord {
  source: string;
  sourceUrl: string;
  verified: boolean;
  period: string;
  currency: string;
  metrics: {
    revenue?: number;
    netIncome?: number;
    totalAssets?: number;
    totalLiabilities?: number;
    employees?: number;
    grossProfit?: number;
    operatingIncome?: number;
    ebitda?: number;
  };
  rawData?: string;
}

export interface FinancialData {
  available: boolean;
  source: 'SEC' | 'Companies House' | 'Public Filing' | 'None';
  companyType: 'Public US' | 'UK Company' | 'Private' | 'Unknown';
  records: FinancialRecord[];
  filingLinks: Array<{ name: string; url: string; date: string }>;
  ticker?: string;
  cik?: string;
  companyNumber?: string;
}

export async function collectFinancialSignals(
  context: CollectorContext
): Promise<CollectorResult & { financialData: FinancialData }> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const errors: CollectorResult['errors'] = [];

  let financialData: FinancialData = {
    available: false,
    source: 'None',
    companyType: 'Unknown',
    records: [],
    filingLinks: [],
  };

  // Try SEC EDGAR first (US public companies)
  try {
    const secData = await checkSECEdgar(companyName || domain);
    if (secData.found) {
      financialData = {
        available: true,
        source: 'SEC',
        companyType: 'Public US',
        records: secData.records,
        filingLinks: secData.filings,
        ticker: secData.ticker,
        cik: secData.cik,
      };
    }
  } catch (e) {
    errors.push({
      code: 'SEC_ERROR',
      message: `SEC lookup failed: ${e}`,
      recoverable: true,
    });
  }

  // Try Companies House (UK companies)
  if (!financialData.available) {
    try {
      const ukData = await checkCompaniesHouse(companyName || domain);
      if (ukData.found) {
        financialData = {
          available: true,
          source: 'Companies House',
          companyType: 'UK Company',
          records: ukData.records,
          filingLinks: ukData.filings,
          companyNumber: ukData.companyNumber,
        };
      }
    } catch (e) {
      errors.push({
        code: 'UK_ERROR',
        message: `Companies House lookup failed: ${e}`,
        recoverable: true,
      });
    }
  }

  // Search for public financial mentions via Serper
  if (!financialData.available && SERPER_API_KEY) {
    try {
      const publicFilings = await searchPublicFinancials(companyName || domain);
      if (publicFilings.found) {
        financialData = {
          available: true,
          source: 'Public Filing',
          companyType: 'Private',
          records: publicFilings.records,
          filingLinks: publicFilings.filings,
        };
      }
    } catch (e) {
      errors.push({
        code: 'SEARCH_ERROR',
        message: `Financial search failed: ${e}`,
        recoverable: true,
      });
    }
  }

  return {
    signals: [],
    metadata: { financialData },
    errors,
    duration: Date.now() - startTime,
    financialData,
  };
}

interface SECResult {
  found: boolean;
  ticker?: string;
  cik?: string;
  records: FinancialRecord[];
  filings: Array<{ name: string; url: string; date: string }>;
}

async function checkSECEdgar(companyName: string): Promise<SECResult> {
  // SEC EDGAR Company Search API (free, no key required)
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&dateRange=custom&startdt=2020-01-01&enddt=${new Date().toISOString().split('T')[0]}&forms=10-K,10-Q`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'DiligenceScanner/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { found: false, records: [], filings: [] };
    }

    const data = await response.json();

    if (!data.hits || data.hits.total?.value === 0) {
      return { found: false, records: [], filings: [] };
    }

    const hits = data.hits.hits || [];
    const filings: Array<{ name: string; url: string; date: string }> = [];
    let cik: string | undefined;
    let ticker: string | undefined;

    for (const hit of hits.slice(0, 5)) {
      const source = hit._source || {};
      cik = cik || source.ciks?.[0];
      ticker = ticker || source.tickers?.[0];

      filings.push({
        name: source.form || 'Filing',
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${source.ciks?.[0]}&type=10-K&dateb=&owner=include&count=40`,
        date: source.file_date || source.period_of_report || '',
      });
    }

    // Get actual financial data from XBRL if CIK found
    const records: FinancialRecord[] = [];
    if (cik) {
      const xbrlData = await fetchSECFinancials(cik);
      if (xbrlData) {
        records.push(xbrlData);
      }
    }

    return {
      found: filings.length > 0,
      ticker,
      cik,
      records,
      filings,
    };
  } catch {
    return { found: false, records: [], filings: [] };
  }
}

async function fetchSECFinancials(cik: string): Promise<FinancialRecord | null> {
  // SEC Company Facts API (free, provides XBRL data)
  const paddedCik = cik.padStart(10, '0');
  const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

  try {
    const response = await fetch(factsUrl, {
      headers: {
        'User-Agent': 'DiligenceScanner/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const facts = data.facts?.['us-gaap'] || {};

    // Extract latest annual metrics
    const getLatestValue = (concept: string): number | undefined => {
      const conceptData = facts[concept]?.units?.USD;
      if (!conceptData || conceptData.length === 0) return undefined;

      // Get most recent 10-K filing
      const annualFilings = conceptData.filter((f: { form: string }) => f.form === '10-K');
      if (annualFilings.length === 0) return undefined;

      const latest = annualFilings.sort((a: { end: string }, b: { end: string }) =>
        new Date(b.end).getTime() - new Date(a.end).getTime()
      )[0];

      return latest?.val;
    };

    const revenue = getLatestValue('Revenues') || getLatestValue('RevenueFromContractWithCustomerExcludingAssessedTax');
    const netIncome = getLatestValue('NetIncomeLoss');
    const totalAssets = getLatestValue('Assets');
    const totalLiabilities = getLatestValue('Liabilities');
    const grossProfit = getLatestValue('GrossProfit');
    const operatingIncome = getLatestValue('OperatingIncomeLoss');

    if (!revenue && !netIncome && !totalAssets) {
      return null;
    }

    return {
      source: 'SEC EDGAR (XBRL)',
      sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`,
      verified: true,
      period: 'Latest Annual Filing (10-K)',
      currency: 'USD',
      metrics: {
        revenue,
        netIncome,
        totalAssets,
        totalLiabilities,
        grossProfit,
        operatingIncome,
      },
    };
  } catch {
    return null;
  }
}

interface UKResult {
  found: boolean;
  companyNumber?: string;
  records: FinancialRecord[];
  filings: Array<{ name: string; url: string; date: string }>;
}

async function checkCompaniesHouse(companyName: string): Promise<UKResult> {
  // Companies House search (basic search without API key)
  // Note: For full access, user would need to register for free API key
  const searchUrl = `https://find-and-update.company-information.service.gov.uk/search?q=${encodeURIComponent(companyName)}`;

  // For now, we'll use Serper to find Companies House filings
  if (!SERPER_API_KEY) {
    return { found: false, records: [], filings: [] };
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${companyName}" site:find-and-update.company-information.service.gov.uk`,
        num: 5,
      }),
    });

    const data = await response.json();
    const results = data.organic || [];

    const filings: Array<{ name: string; url: string; date: string }> = [];
    let companyNumber: string | undefined;

    for (const result of results) {
      // Extract company number from URL if possible
      const match = result.link?.match(/\/company\/([A-Z0-9]+)/);
      if (match) {
        companyNumber = match[1];
        filings.push({
          name: 'Companies House Filing',
          url: result.link,
          date: '',
        });
      }
    }

    return {
      found: filings.length > 0,
      companyNumber,
      records: [],
      filings,
    };
  } catch {
    return { found: false, records: [], filings: [] };
  }
}

interface PublicFilingResult {
  found: boolean;
  records: FinancialRecord[];
  filings: Array<{ name: string; url: string; date: string }>;
}

async function searchPublicFinancials(companyName: string): Promise<PublicFilingResult> {
  if (!SERPER_API_KEY) {
    return { found: false, records: [], filings: [] };
  }

  try {
    // Search for verified financial disclosures
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${companyName}" (annual report OR financial statements OR revenue OR "total funding") filetype:pdf`,
        num: 10,
      }),
    });

    const data = await response.json();
    const results = data.organic || [];

    const filings: Array<{ name: string; url: string; date: string }> = [];

    // Only include results from credible sources
    const credibleDomains = [
      'sec.gov',
      'companieshouse.gov.uk',
      'annualreports.com',
      'crunchbase.com',
      'pitchbook.com',
      '.gov',
      'investor',
      'ir.',
    ];

    for (const result of results) {
      const isCredible = credibleDomains.some((domain) =>
        result.link?.toLowerCase().includes(domain)
      );

      if (isCredible) {
        filings.push({
          name: result.title || 'Financial Document',
          url: result.link,
          date: '',
        });
      }
    }

    return {
      found: filings.length > 0,
      records: [],
      filings: filings.slice(0, 5),
    };
  } catch {
    return { found: false, records: [], filings: [] };
  }
}

// Format currency for display
export function formatCurrency(value: number | undefined, currency: string = 'USD'): string {
  if (value === undefined) return 'N/A';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  return formatter.format(value);
}

// Format number for display
export function formatNumber(value: number | undefined): string {
  if (value === undefined) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
