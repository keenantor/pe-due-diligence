/**
 * Yahoo Finance data fetcher - Free backup source for financial data
 * Uses the yahoo-finance2 package to fetch data without requiring an API key
 */

import yahooFinance from 'yahoo-finance2';
import { FinancialMetrics, FinancialRatios, GrowthMetrics } from './financials';

export interface YahooFinanceResult {
  found: boolean;
  ticker?: string;
  companyName?: string;
  metrics?: FinancialMetrics;
  error?: string;
}

/**
 * Search for a company ticker on Yahoo Finance
 */
export async function searchYahooTicker(companyName: string): Promise<{ found: boolean; ticker?: string; companyName?: string }> {
  try {
    const results = await yahooFinance.search(companyName, { quotesCount: 5, newsCount: 0 });

    // Type assertion for the results
    const searchResults = results as { quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchange?: string }> };

    if (!searchResults.quotes || searchResults.quotes.length === 0) {
      console.log(`[Yahoo Finance] No ticker found for "${companyName}"`);
      return { found: false };
    }

    // Prefer equity quotes from major exchanges
    const equityQuote = searchResults.quotes.find(
      (q) => q.quoteType === 'EQUITY' && ['NMS', 'NYQ', 'NGM', 'NAS'].includes(q.exchange || '')
    ) || searchResults.quotes.find((q) => q.quoteType === 'EQUITY') || searchResults.quotes[0];

    console.log(`[Yahoo Finance] Found ticker: ${equityQuote.symbol} (${equityQuote.shortname || equityQuote.longname})`);

    return {
      found: true,
      ticker: equityQuote.symbol,
      companyName: equityQuote.shortname || equityQuote.longname || companyName,
    };
  } catch (e) {
    console.error('[Yahoo Finance] Search error:', e);
    return { found: false };
  }
}

/**
 * Fetch comprehensive financial data from Yahoo Finance
 */
export async function fetchYahooFinanceData(ticker: string): Promise<FinancialMetrics | null> {
  try {
    console.log(`[Yahoo Finance] Fetching data for ${ticker}...`);

    // Fetch quote summary with financial modules
    const quoteSummary = await yahooFinance.quoteSummary(ticker, {
      modules: [
        'financialData',
        'defaultKeyStatistics',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory',
      ],
    });

    if (!quoteSummary) {
      console.log(`[Yahoo Finance] No data returned for ${ticker}`);
      return null;
    }

    // Cast to generic object for flexible access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = quoteSummary as any;

    // Type assertions for the response
    const financialData = summary.financialData as Record<string, number | undefined> | undefined;
    const keyStats = summary.defaultKeyStatistics as Record<string, number | undefined> | undefined;
    const incomeHistory = (summary.incomeStatementHistory?.incomeStatementHistory || []) as Array<Record<string, number | Date | undefined>>;
    const balanceHistory = (summary.balanceSheetHistory?.balanceSheetHistory || []) as Array<Record<string, number | undefined>>;
    const cashflowHistory = (summary.cashflowStatementHistory?.cashflowStatementHistory || []) as Array<Record<string, number | undefined>>;

    // Get most recent annual data
    const latestIncome = incomeHistory[0];
    const latestBalance = balanceHistory[0];
    const latestCashflow = cashflowHistory[0];

    const metrics: FinancialMetrics = {
      currency: (financialData?.financialCurrency as unknown as string) || 'USD',
      fiscalYear: latestIncome?.endDate ? new Date(latestIncome.endDate as Date).getFullYear().toString() : undefined,
      period: 'FY',
    };

    // Income statement metrics
    if (latestIncome) {
      metrics.revenue = latestIncome.totalRevenue as number | undefined;
      metrics.grossProfit = latestIncome.grossProfit as number | undefined;
      metrics.operatingIncome = latestIncome.operatingIncome as number | undefined;
      metrics.netIncome = latestIncome.netIncome as number | undefined;
      metrics.ebitda = latestIncome.ebitda as number | undefined;
    }

    // Use financialData for some metrics if income history not available
    if (financialData) {
      if (!metrics.revenue && financialData.totalRevenue) metrics.revenue = financialData.totalRevenue;
      if (!metrics.ebitda && financialData.ebitda) metrics.ebitda = financialData.ebitda;
      if (!metrics.operatingCashFlow && financialData.operatingCashflow) metrics.operatingCashFlow = financialData.operatingCashflow;
      if (!metrics.freeCashFlow && financialData.freeCashflow) metrics.freeCashFlow = financialData.freeCashflow;
    }

    // Balance sheet metrics
    if (latestBalance) {
      metrics.totalAssets = latestBalance.totalAssets;
      metrics.totalLiabilities = latestBalance.totalLiab;
      metrics.totalEquity = latestBalance.totalStockholderEquity;
      const longTermDebt = latestBalance.longTermDebt || 0;
      const shortTermDebt = latestBalance.shortLongTermDebt || 0;
      metrics.totalDebt = longTermDebt + shortTermDebt || undefined;
      metrics.currentAssets = latestBalance.totalCurrentAssets;
      metrics.currentLiabilities = latestBalance.totalCurrentLiabilities;
    }

    // Cash flow metrics
    if (latestCashflow) {
      if (!metrics.operatingCashFlow) metrics.operatingCashFlow = latestCashflow.totalCashFromOperatingActivities;
      if (latestCashflow.capitalExpenditures) metrics.capitalExpenditures = Math.abs(latestCashflow.capitalExpenditures);
      // Free cash flow = Operating Cash Flow - CapEx
      if (!metrics.freeCashFlow && metrics.operatingCashFlow && metrics.capitalExpenditures) {
        metrics.freeCashFlow = metrics.operatingCashFlow - metrics.capitalExpenditures;
      }
    }

    // EPS from key statistics
    if (keyStats?.trailingEps) {
      metrics.eps = keyStats.trailingEps;
    }

    // Calculate ratios
    const ratios: FinancialRatios = {};

    if (financialData) {
      ratios.grossMargin = financialData.grossMargins;
      ratios.operatingMargin = financialData.operatingMargins;
      ratios.netMargin = financialData.profitMargins;
      ratios.returnOnEquity = financialData.returnOnEquity;
      ratios.returnOnAssets = financialData.returnOnAssets;
      ratios.currentRatio = financialData.currentRatio;
      ratios.debtToEquity = financialData.debtToEquity;
    }

    // Calculate EBITDA margin if we have both values
    if (metrics.ebitda && metrics.revenue) {
      ratios.ebitdaMargin = metrics.ebitda / metrics.revenue;
    }

    if (Object.keys(ratios).length > 0) {
      metrics.ratios = ratios;
    }

    // Calculate growth from historical data
    if (incomeHistory.length >= 2) {
      const currentRevenue = incomeHistory[0]?.totalRevenue as number | undefined;
      const previousRevenue = incomeHistory[1]?.totalRevenue as number | undefined;
      const currentNetIncome = incomeHistory[0]?.netIncome as number | undefined;
      const previousNetIncome = incomeHistory[1]?.netIncome as number | undefined;

      const growth: GrowthMetrics = {};

      if (currentRevenue && previousRevenue && previousRevenue !== 0) {
        growth.revenueGrowthYoY = (currentRevenue - previousRevenue) / Math.abs(previousRevenue);
      }

      if (currentNetIncome && previousNetIncome && previousNetIncome !== 0) {
        growth.netIncomeGrowthYoY = (currentNetIncome - previousNetIncome) / Math.abs(previousNetIncome);
      }

      if (Object.keys(growth).length > 0) {
        metrics.growth = growth;
      }
    }

    // Build historical data arrays
    if (incomeHistory.length > 0) {
      metrics.historicalRevenue = incomeHistory
        .filter((h) => h.endDate && h.totalRevenue)
        .map((h) => ({
          year: new Date(h.endDate as Date).getFullYear().toString(),
          value: h.totalRevenue as number,
        }))
        .reverse();

      metrics.historicalNetIncome = incomeHistory
        .filter((h) => h.endDate && h.netIncome !== undefined)
        .map((h) => ({
          year: new Date(h.endDate as Date).getFullYear().toString(),
          value: h.netIncome as number,
        }))
        .reverse();
    }

    // Only return if we have meaningful data
    if (metrics.revenue || metrics.netIncome || metrics.totalAssets) {
      console.log(`[Yahoo Finance] SUCCESS - Got metrics for ${ticker}`);
      return metrics;
    }

    console.log(`[Yahoo Finance] No meaningful metrics found for ${ticker}`);
    return null;
  } catch (e) {
    console.error('[Yahoo Finance] Fetch error:', e);
    return null;
  }
}

/**
 * Full Yahoo Finance lookup: search for ticker then fetch data
 */
export async function lookupYahooFinance(companyName: string): Promise<YahooFinanceResult> {
  try {
    // First, search for the ticker
    const searchResult = await searchYahooTicker(companyName);

    if (!searchResult.found || !searchResult.ticker) {
      return { found: false, error: 'Company not found on Yahoo Finance' };
    }

    // Fetch financial data
    const metrics = await fetchYahooFinanceData(searchResult.ticker);

    if (!metrics) {
      return {
        found: true,
        ticker: searchResult.ticker,
        companyName: searchResult.companyName,
        error: 'No financial data available'
      };
    }

    return {
      found: true,
      ticker: searchResult.ticker,
      companyName: searchResult.companyName,
      metrics,
    };
  } catch (e) {
    console.error('[Yahoo Finance] Lookup error:', e);
    return { found: false, error: String(e) };
  }
}
