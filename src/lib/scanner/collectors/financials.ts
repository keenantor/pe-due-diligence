import { CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

export interface FinancialRecord {
  source: string;
  sourceUrl: string;
  verified: boolean;
  period: string;
  description: string;
}

export interface FinancialMetrics {
  revenue?: number;
  netIncome?: number;
  grossProfit?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  operatingIncome?: number;
  eps?: number;
  period?: string;
  fiscalYear?: string;
  currency?: string;
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
  message: string;
  metrics?: FinancialMetrics;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    message: 'No public financial filings found',
  };

  console.log(`[Financials] Starting search for: "${companyName || domain}"`);

  // Try SEC EDGAR first (US public companies)
  try {
    console.log(`[Financials] Step 1: Checking SEC EDGAR...`);
    await delay(1000);

    const secData = await checkSECEdgar(companyName || domain || '');
    if (secData.found) {
      financialData = {
        available: true,
        source: 'SEC',
        companyType: 'Public US',
        records: [{
          source: 'SEC EDGAR',
          sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${secData.cik}&type=10-K`,
          verified: true,
          period: 'Annual Filings Available',
          description: 'View official SEC filings for verified financial data',
        }],
        filingLinks: secData.filings,
        ticker: secData.ticker,
        cik: secData.cik,
        message: `Public company - SEC filings available (CIK: ${secData.cik}${secData.ticker ? `, Ticker: ${secData.ticker}` : ''})`,
      };
      console.log(`[Financials] FOUND SEC filings for CIK: ${secData.cik}`);

      // If we have a ticker, try to get actual financial metrics from FMP
      if (secData.ticker && FMP_API_KEY) {
        console.log(`[Financials] Step 1b: Fetching financial metrics for ${secData.ticker}...`);
        await delay(500);

        const metrics = await fetchFinancialMetrics(secData.ticker);
        if (metrics) {
          financialData.metrics = metrics;
          console.log(`[Financials] FOUND financial metrics for ${secData.ticker}`);
        }
      }
    }
  } catch (e) {
    console.error(`[Financials] SEC error:`, e);
    errors.push({
      code: 'SEC_ERROR',
      message: `SEC lookup failed: ${e}`,
      recoverable: true,
    });
  }

  // Try Companies House (UK companies)
  if (!financialData.available) {
    try {
      console.log(`[Financials] Step 2: Checking Companies House...`);
      await delay(1000);

      const ukData = await checkCompaniesHouse(companyName || domain || '');
      if (ukData.found) {
        financialData = {
          available: true,
          source: 'Companies House',
          companyType: 'UK Company',
          records: [{
            source: 'Companies House',
            sourceUrl: ukData.filings[0]?.url || 'https://find-and-update.company-information.service.gov.uk/',
            verified: true,
            period: 'UK Company Filings',
            description: 'View official UK company filings',
          }],
          filingLinks: ukData.filings,
          companyNumber: ukData.companyNumber,
          message: `UK company filings available (Company #: ${ukData.companyNumber})`,
        };
        console.log(`[Financials] FOUND UK filings for: ${ukData.companyNumber}`);
      }
    } catch (e) {
      console.error(`[Financials] UK error:`, e);
      errors.push({
        code: 'UK_ERROR',
        message: `Companies House lookup failed: ${e}`,
        recoverable: true,
      });
    }
  }

  // Search for public financial mentions
  if (!financialData.available && SERPER_API_KEY) {
    try {
      console.log(`[Financials] Step 3: Searching for public financial documents...`);
      await delay(1000);

      const publicFilings = await searchPublicFinancials(companyName || domain || '');
      if (publicFilings.found) {
        financialData = {
          available: true,
          source: 'Public Filing',
          companyType: 'Private',
          records: [{
            source: 'Public Documents',
            sourceUrl: publicFilings.filings[0]?.url || '',
            verified: false,
            period: 'Various',
            description: 'Financial documents found via search - verify independently',
          }],
          filingLinks: publicFilings.filings,
          message: 'Financial documents found - click links to verify',
        };
        console.log(`[Financials] FOUND public financial documents`);
      }
    } catch (e) {
      console.error(`[Financials] Search error:`, e);
      errors.push({
        code: 'SEARCH_ERROR',
        message: `Financial search failed: ${e}`,
        recoverable: true,
      });
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[Financials] Complete in ${duration}ms - Available: ${financialData.available}`);

  return {
    signals: [],
    metadata: { financialData },
    errors,
    duration,
    financialData,
  };
}

interface SECResult {
  found: boolean;
  ticker?: string;
  cik?: string;
  filings: Array<{ name: string; url: string; date: string }>;
}

async function checkSECEdgar(companyName: string): Promise<SECResult> {
  // SEC EDGAR Company Search API
  const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}&dateRange=custom&startdt=2020-01-01&enddt=${new Date().toISOString().split('T')[0]}&forms=10-K,10-Q`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'DiligenceScanner/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { found: false, filings: [] };
    }

    const data = await response.json();

    if (!data.hits || data.hits.total?.value === 0) {
      return { found: false, filings: [] };
    }

    const hits = data.hits.hits || [];
    const filings: Array<{ name: string; url: string; date: string }> = [];
    let cik: string | undefined;
    let ticker: string | undefined;

    for (const hit of hits.slice(0, 5)) {
      const source = hit._source || {};
      cik = cik || source.ciks?.[0];
      ticker = ticker || source.tickers?.[0];

      const filingCik = source.ciks?.[0];
      filings.push({
        name: `${source.form || 'Filing'} - ${source.company_name || companyName}`,
        url: filingCik
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filingCik}&type=${source.form || '10-K'}&dateb=&owner=include&count=10`
          : `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&type=10-K`,
        date: source.file_date || source.period_of_report || '',
      });
    }

    return {
      found: filings.length > 0 && !!cik,
      ticker,
      cik,
      filings,
    };
  } catch (e) {
    console.error('[Financials] SEC search error:', e);
    return { found: false, filings: [] };
  }
}

interface UKResult {
  found: boolean;
  companyNumber?: string;
  filings: Array<{ name: string; url: string; date: string }>;
}

async function checkCompaniesHouse(companyName: string): Promise<UKResult> {
  if (!SERPER_API_KEY) {
    return { found: false, filings: [] };
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
      const match = result.link?.match(/\/company\/([A-Z0-9]+)/);
      if (match) {
        companyNumber = match[1];
        filings.push({
          name: result.title || 'Companies House Filing',
          url: result.link,
          date: '',
        });
      }
    }

    return {
      found: filings.length > 0,
      companyNumber,
      filings,
    };
  } catch {
    return { found: false, filings: [] };
  }
}

interface PublicFilingResult {
  found: boolean;
  filings: Array<{ name: string; url: string; date: string }>;
}

async function searchPublicFinancials(companyName: string): Promise<PublicFilingResult> {
  if (!SERPER_API_KEY) {
    return { found: false, filings: [] };
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${companyName}" (annual report OR investor relations OR financial statements)`,
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
      filings: filings.slice(0, 5),
    };
  } catch {
    return { found: false, filings: [] };
  }
}

// Fetch financial metrics from Financial Modeling Prep API (using new stable endpoints)
async function fetchFinancialMetrics(ticker: string): Promise<FinancialMetrics | null> {
  if (!FMP_API_KEY) {
    return null;
  }

  try {
    // Get the latest annual income statement (new stable API endpoints)
    const incomeUrl = `https://financialmodelingprep.com/stable/income-statement?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`;
    const balanceUrl = `https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`;

    const [incomeResponse, balanceResponse] = await Promise.all([
      fetch(incomeUrl),
      fetch(balanceUrl),
    ]);

    if (!incomeResponse.ok || !balanceResponse.ok) {
      console.log(`[Financials] FMP API returned non-OK status`);
      return null;
    }

    const incomeData = await incomeResponse.json();
    const balanceData = await balanceResponse.json();

    // FMP returns an array, get the first (most recent) entry
    const income = Array.isArray(incomeData) ? incomeData[0] : null;
    const balance = Array.isArray(balanceData) ? balanceData[0] : null;

    if (!income && !balance) {
      console.log(`[Financials] No financial data returned from FMP`);
      return null;
    }

    const metrics: FinancialMetrics = {
      currency: income?.reportedCurrency || 'USD',
      fiscalYear: income?.calendarYear || balance?.calendarYear,
      period: income?.period || 'FY',
    };

    // Income statement metrics
    if (income) {
      if (income.revenue) metrics.revenue = income.revenue;
      if (income.netIncome) metrics.netIncome = income.netIncome;
      if (income.grossProfit) metrics.grossProfit = income.grossProfit;
      if (income.operatingIncome) metrics.operatingIncome = income.operatingIncome;
      if (income.eps) metrics.eps = income.eps;
    }

    // Balance sheet metrics
    if (balance) {
      if (balance.totalAssets) metrics.totalAssets = balance.totalAssets;
      if (balance.totalLiabilities) metrics.totalLiabilities = balance.totalLiabilities;
      if (balance.totalStockholdersEquity) metrics.totalEquity = balance.totalStockholdersEquity;
    }

    // Only return if we have at least one meaningful metric
    if (metrics.revenue || metrics.netIncome || metrics.totalAssets) {
      return metrics;
    }

    return null;
  } catch (e) {
    console.error('[Financials] FMP API error:', e);
    return null;
  }
}
