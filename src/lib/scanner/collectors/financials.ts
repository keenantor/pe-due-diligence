import { CollectorResult, CollectorContext } from '../types';
import { lookupYahooFinance } from './yahoo-finance';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

export interface FinancialRecord {
  source: string;
  sourceUrl: string;
  verified: boolean;
  period: string;
  description: string;
}

// Financial ratios for PE analysis
export interface FinancialRatios {
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  ebitdaMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
}

// Growth metrics
export interface GrowthMetrics {
  revenueGrowthYoY?: number;
  netIncomeGrowthYoY?: number;
  epsGrowthYoY?: number;
}

// Historical data point
export interface HistoricalDataPoint {
  year: string;
  value: number;
}

export interface FinancialMetrics {
  // Core income metrics
  revenue?: number;
  netIncome?: number;
  grossProfit?: number;
  operatingIncome?: number;
  eps?: number;

  // EBITDA & Cash Flow
  ebitda?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  capitalExpenditures?: number;

  // Balance sheet metrics
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  totalDebt?: number;
  currentAssets?: number;
  currentLiabilities?: number;

  // Financial ratios
  ratios?: FinancialRatios;

  // Growth metrics
  growth?: GrowthMetrics;

  // Historical data (3-5 years)
  historicalRevenue?: HistoricalDataPoint[];
  historicalNetIncome?: HistoricalDataPoint[];

  // Metadata
  period?: string;
  fiscalYear?: string;
  currency?: string;
}

export interface FinancialData {
  available: boolean;
  source: 'SEC' | 'Companies House' | 'Public Filing' | 'Yahoo Finance' | 'None';
  companyType: 'Public US' | 'UK Company' | 'Private' | 'Unknown';
  records: FinancialRecord[];
  filingLinks: Array<{ name: string; url: string; date: string }>;
  ticker?: string;
  cik?: string;
  companyNumber?: string;
  message: string;
  metrics?: FinancialMetrics;
  unavailableReason?: 'not_configured' | 'not_found' | 'private_company';
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
    unavailableReason: FMP_API_KEY ? undefined : 'not_configured',
  };

  console.log(`[Financials] Starting search for: "${companyName || domain}"`);

  // Step 1: Try to find ticker via FMP search (most reliable for US public companies)
  if (FMP_API_KEY) {
    try {
      console.log(`[Financials] Step 1: Searching for ticker via FMP...`);
      await delay(500);

      const tickerResult = await searchTickerByName(companyName || domain || '');
      if (tickerResult.found && tickerResult.ticker) {
        console.log(`[Financials] Found ticker: ${tickerResult.ticker} for ${tickerResult.companyName}`);

        // Fetch financial metrics
        console.log(`[Financials] Step 2: Fetching financial metrics for ${tickerResult.ticker}...`);
        await delay(500);

        const metrics = await fetchFinancialMetrics(tickerResult.ticker);

        if (metrics) {
          financialData = {
            available: true,
            source: 'SEC',
            companyType: 'Public US',
            records: [{
              source: 'SEC EDGAR / FMP',
              sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(tickerResult.companyName || '')}&type=10-K`,
              verified: true,
              period: `FY ${metrics.fiscalYear || 'Latest'}`,
              description: 'Verified financial data from SEC filings',
            }],
            filingLinks: [{
              name: `SEC Filings - ${tickerResult.companyName}`,
              url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(tickerResult.companyName || '')}&type=10-K&dateb=&owner=include&count=10`,
              date: '',
            }],
            ticker: tickerResult.ticker,
            message: `Public company - ${tickerResult.companyName} (${tickerResult.ticker})`,
            metrics,
          };
          console.log(`[Financials] SUCCESS - Got financial metrics for ${tickerResult.ticker}`);
        }
      }
    } catch (e) {
      console.error(`[Financials] FMP search error:`, e);
      errors.push({
        code: 'FMP_SEARCH_ERROR',
        message: `FMP ticker search failed: ${e}`,
        recoverable: true,
      });
    }
  }

  // Step 2: Try Yahoo Finance as backup (free, no API key needed)
  if (!financialData.available) {
    try {
      console.log(`[Financials] Step 2: Trying Yahoo Finance...`);
      await delay(500);

      const yahooResult = await lookupYahooFinance(companyName || domain || '');
      if (yahooResult.found && yahooResult.metrics) {
        financialData = {
          available: true,
          source: 'Yahoo Finance',
          companyType: 'Public US',
          records: [{
            source: 'Yahoo Finance',
            sourceUrl: `https://finance.yahoo.com/quote/${yahooResult.ticker}`,
            verified: false,
            period: `FY ${yahooResult.metrics.fiscalYear || 'Latest'}`,
            description: 'Financial data from Yahoo Finance - verify with official SEC filings',
          }],
          filingLinks: yahooResult.ticker ? [{
            name: `Yahoo Finance - ${yahooResult.companyName}`,
            url: `https://finance.yahoo.com/quote/${yahooResult.ticker}/financials`,
            date: '',
          }, {
            name: `SEC Filings`,
            url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(yahooResult.companyName || '')}&type=10-K`,
            date: '',
          }] : [],
          ticker: yahooResult.ticker,
          message: `${yahooResult.companyName} (${yahooResult.ticker}) - Data from Yahoo Finance`,
          metrics: yahooResult.metrics,
        };
        console.log(`[Financials] SUCCESS - Got Yahoo Finance data for ${yahooResult.ticker}`);
      }
    } catch (e) {
      console.error(`[Financials] Yahoo Finance error:`, e);
      errors.push({
        code: 'YAHOO_FINANCE_ERROR',
        message: `Yahoo Finance lookup failed: ${e}`,
        recoverable: true,
      });
    }
  }

  // Step 3: Fallback to SEC EDGAR search if still nothing found
  if (!financialData.available) {
    try {
      console.log(`[Financials] Step 3: Fallback - Checking SEC EDGAR...`);
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
      }
    } catch (e) {
      console.error(`[Financials] SEC error:`, e);
      errors.push({
        code: 'SEC_ERROR',
        message: `SEC lookup failed: ${e}`,
        recoverable: true,
      });
    }
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

  // Set unavailableReason if data was not found
  if (!financialData.available) {
    if (!FMP_API_KEY) {
      financialData.unavailableReason = 'not_configured';
      financialData.message = 'Financial data API not configured - add FMP_API_KEY to enable';
    } else {
      financialData.unavailableReason = 'not_found';
      financialData.message = 'No public financial filings found - may be a private company';
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

      // Extract ticker from display_names like "MICROSOFT CORP (MSFT) (CIK 0000789019)"
      if (!ticker && source.display_names?.[0]) {
        const tickerMatch = source.display_names[0].match(/\(([A-Z]{1,5})\)/);
        if (tickerMatch) {
          ticker = tickerMatch[1];
        }
      }

      const filingCik = source.ciks?.[0];
      const displayName = source.display_names?.[0] || '';
      const companyNameFromSec = displayName.split('(')[0]?.trim() || companyName;

      filings.push({
        name: `${source.form || 'Filing'} - ${companyNameFromSec}`,
        url: filingCik
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filingCik}&type=${source.form || '10-K'}&dateb=&owner=include&count=10`
          : `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&type=10-K`,
        date: source.file_date || source.period_of_report || '',
      });
    }

    console.log(`[Financials] SEC search found CIK: ${cik}, Ticker: ${ticker}`);

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

// Search for ticker by company name using FMP
async function searchTickerByName(companyName: string): Promise<{ found: boolean; ticker?: string; companyName?: string }> {
  if (!FMP_API_KEY) {
    return { found: false };
  }

  try {
    const searchUrl = `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(companyName)}&apikey=${FMP_API_KEY}`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.log(`[Financials] FMP search returned ${response.status}`);
      return { found: false };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[Financials] No ticker found for "${companyName}"`);
      return { found: false };
    }

    // Find the best match - prefer US exchanges (NASDAQ, NYSE)
    const usExchanges = ['NASDAQ', 'NYSE', 'AMEX'];
    const usMatch = data.find((item: { exchange?: string }) =>
      usExchanges.some(ex => item.exchange?.toUpperCase().includes(ex))
    );

    const bestMatch = usMatch || data[0];

    console.log(`[Financials] Found ticker: ${bestMatch.symbol} (${bestMatch.name}) on ${bestMatch.exchange}`);

    return {
      found: true,
      ticker: bestMatch.symbol,
      companyName: bestMatch.name,
    };
  } catch (e) {
    console.error('[Financials] FMP ticker search error:', e);
    return { found: false };
  }
}

// Fetch comprehensive financial metrics from Financial Modeling Prep API
async function fetchFinancialMetrics(ticker: string): Promise<FinancialMetrics | null> {
  if (!FMP_API_KEY) {
    return null;
  }

  const FMP_BASE = 'https://financialmodelingprep.com/stable';

  try {
    // Fetch all financial data in parallel for efficiency
    const [
      incomeResponse,
      balanceResponse,
      cashFlowResponse,
      keyMetricsResponse,
      growthResponse,
      historicalIncomeResponse,
    ] = await Promise.all([
      fetch(`${FMP_BASE}/income-statement?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/balance-sheet-statement?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/cash-flow-statement?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/key-metrics?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/financial-growth?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${FMP_BASE}/income-statement?symbol=${ticker}&period=annual&limit=5&apikey=${FMP_API_KEY}`),
    ]);

    // Parse all responses
    const [incomeData, balanceData, cashFlowData, keyMetricsData, growthData, historicalData] = await Promise.all([
      incomeResponse.ok ? incomeResponse.json() : [],
      balanceResponse.ok ? balanceResponse.json() : [],
      cashFlowResponse.ok ? cashFlowResponse.json() : [],
      keyMetricsResponse.ok ? keyMetricsResponse.json() : [],
      growthResponse.ok ? growthResponse.json() : [],
      historicalIncomeResponse.ok ? historicalIncomeResponse.json() : [],
    ]);

    // Get the most recent entries
    const income = Array.isArray(incomeData) && incomeData.length > 0 ? incomeData[0] : null;
    const balance = Array.isArray(balanceData) && balanceData.length > 0 ? balanceData[0] : null;
    const cashFlow = Array.isArray(cashFlowData) && cashFlowData.length > 0 ? cashFlowData[0] : null;
    const keyMetrics = Array.isArray(keyMetricsData) && keyMetricsData.length > 0 ? keyMetricsData[0] : null;
    const growth = Array.isArray(growthData) && growthData.length > 0 ? growthData[0] : null;
    const historical = Array.isArray(historicalData) ? historicalData : [];

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
      if (income.ebitda) metrics.ebitda = income.ebitda;
    }

    // Balance sheet metrics
    if (balance) {
      if (balance.totalAssets) metrics.totalAssets = balance.totalAssets;
      if (balance.totalLiabilities) metrics.totalLiabilities = balance.totalLiabilities;
      if (balance.totalStockholdersEquity) metrics.totalEquity = balance.totalStockholdersEquity;
      if (balance.totalDebt) metrics.totalDebt = balance.totalDebt;
      if (balance.totalCurrentAssets) metrics.currentAssets = balance.totalCurrentAssets;
      if (balance.totalCurrentLiabilities) metrics.currentLiabilities = balance.totalCurrentLiabilities;
    }

    // Cash flow metrics
    if (cashFlow) {
      if (cashFlow.operatingCashFlow) metrics.operatingCashFlow = cashFlow.operatingCashFlow;
      if (cashFlow.freeCashFlow) metrics.freeCashFlow = cashFlow.freeCashFlow;
      if (cashFlow.capitalExpenditure) metrics.capitalExpenditures = Math.abs(cashFlow.capitalExpenditure);
    }

    // Key metrics (ratios) - use pre-calculated from FMP or calculate manually
    if (keyMetrics) {
      metrics.ratios = {
        grossMargin: keyMetrics.grossProfitMargin ?? (income?.grossProfit && income?.revenue ? income.grossProfit / income.revenue : undefined),
        operatingMargin: keyMetrics.operatingProfitMargin ?? (income?.operatingIncome && income?.revenue ? income.operatingIncome / income.revenue : undefined),
        netMargin: keyMetrics.netProfitMargin ?? (income?.netIncome && income?.revenue ? income.netIncome / income.revenue : undefined),
        ebitdaMargin: income?.ebitda && income?.revenue ? income.ebitda / income.revenue : undefined,
        debtToEquity: keyMetrics.debtToEquity ?? (balance?.totalDebt && balance?.totalStockholdersEquity ? balance.totalDebt / balance.totalStockholdersEquity : undefined),
        currentRatio: keyMetrics.currentRatio ?? (balance?.totalCurrentAssets && balance?.totalCurrentLiabilities ? balance.totalCurrentAssets / balance.totalCurrentLiabilities : undefined),
        returnOnEquity: keyMetrics.returnOnEquity ?? keyMetrics.roe,
        returnOnAssets: keyMetrics.returnOnAssets ?? keyMetrics.roa,
      };
    } else if (income || balance) {
      // Calculate ratios manually if key-metrics endpoint failed
      metrics.ratios = {};
      if (income?.grossProfit && income?.revenue) metrics.ratios.grossMargin = income.grossProfit / income.revenue;
      if (income?.operatingIncome && income?.revenue) metrics.ratios.operatingMargin = income.operatingIncome / income.revenue;
      if (income?.netIncome && income?.revenue) metrics.ratios.netMargin = income.netIncome / income.revenue;
      if (income?.ebitda && income?.revenue) metrics.ratios.ebitdaMargin = income.ebitda / income.revenue;
      if (balance?.totalDebt && balance?.totalStockholdersEquity) metrics.ratios.debtToEquity = balance.totalDebt / balance.totalStockholdersEquity;
      if (balance?.totalCurrentAssets && balance?.totalCurrentLiabilities) metrics.ratios.currentRatio = balance.totalCurrentAssets / balance.totalCurrentLiabilities;
      if (income?.netIncome && balance?.totalStockholdersEquity) metrics.ratios.returnOnEquity = income.netIncome / balance.totalStockholdersEquity;
      if (income?.netIncome && balance?.totalAssets) metrics.ratios.returnOnAssets = income.netIncome / balance.totalAssets;
    }

    // Growth metrics
    if (growth) {
      metrics.growth = {
        revenueGrowthYoY: growth.revenueGrowth,
        netIncomeGrowthYoY: growth.netIncomeGrowth,
        epsGrowthYoY: growth.epsgrowth ?? growth.epsGrowth,
      };
    }

    // Historical data (3-5 years of revenue and net income)
    if (historical.length > 0) {
      metrics.historicalRevenue = historical
        .filter((h: { calendarYear?: string; revenue?: number }) => h.calendarYear && h.revenue)
        .map((h: { calendarYear: string; revenue: number }) => ({
          year: h.calendarYear,
          value: h.revenue,
        }))
        .reverse(); // Oldest first

      metrics.historicalNetIncome = historical
        .filter((h: { calendarYear?: string; netIncome?: number }) => h.calendarYear && h.netIncome !== undefined)
        .map((h: { calendarYear: string; netIncome: number }) => ({
          year: h.calendarYear,
          value: h.netIncome,
        }))
        .reverse();
    }

    // Only return if we have at least one meaningful metric
    if (metrics.revenue || metrics.netIncome || metrics.totalAssets) {
      console.log(`[Financials] SUCCESS - Got comprehensive metrics for ${ticker}`);
      return metrics;
    }

    return null;
  } catch (e) {
    console.error('[Financials] FMP API error:', e);
    return null;
  }
}
