'use client';

import { ExternalLink, FileText, DollarSign, TrendingUp, Building2, AlertCircle, CheckCircle2, BarChart3, Percent, ArrowUpRight, ArrowDownRight, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FinancialData as FinancialDataType } from '@/lib/scanner/collectors/financials';

interface FinancialDataProps {
  data: FinancialDataType | undefined;
  aiAnalysis?: string;
}

// Format large numbers as currency
function formatCurrency(value: number, currency: string = 'USD'): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(2)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(2)}K`;
  }
  return `${sign}$${absValue.toFixed(2)}`;
}

// Format percentage
function formatPercent(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  const percentage = value * 100;
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

// Format ratio
function formatRatio(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  return value.toFixed(2);
}

const sourceConfig: Record<string, { badge: string; color: string; borderColor: string; bgColor: string; description: string }> = {
  SEC: {
    badge: 'Verified SEC Data',
    color: 'text-[#22C55E]',
    borderColor: 'border-[#22C55E]/30',
    bgColor: 'bg-[#22C55E]/10',
    description: 'Financial data verified from SEC filings via Financial Modeling Prep',
  },
  'Yahoo Finance': {
    badge: 'Yahoo Finance',
    color: 'text-[#6366F1]',
    borderColor: 'border-[#6366F1]/30',
    bgColor: 'bg-[#6366F1]/10',
    description: 'Financial data from Yahoo Finance - verify with official SEC filings',
  },
  'Companies House': {
    badge: 'UK Companies House',
    color: 'text-[#8B5CF6]',
    borderColor: 'border-[#8B5CF6]/30',
    bgColor: 'bg-[#8B5CF6]/10',
    description: 'Verified from UK Companies House registry',
  },
  'Public Filing': {
    badge: 'Public Filing',
    color: 'text-[#A78BFA]',
    borderColor: 'border-[#A78BFA]/30',
    bgColor: 'bg-[#A78BFA]/10',
    description: 'From publicly available financial documents',
  },
  None: {
    badge: 'Not Available',
    color: 'text-[#71717A]',
    borderColor: 'border-[#71717A]/30',
    bgColor: 'bg-[#71717A]/10',
    description: 'No verified public financial data found',
  },
};

export function FinancialDataDisplay({ data, aiAnalysis }: FinancialDataProps) {
  // Show setup instructions if API not configured
  if (!data || (!data.available && data.unavailableReason === 'not_configured')) {
    return (
      <Card className="bg-[#0F0F14] border-[#27272A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#71717A]" />
            Public Financial Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-[#1E1E26] border border-[#27272A]">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-[#8B5CF6] mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-[#F5F5F7] mb-2">
                  Enable Financial Data Collection
                </h4>
                <p className="text-xs text-[#A1A1AA] mb-3">
                  To display verified financial metrics for public companies, add your API key:
                </p>
                <ol className="text-xs text-[#71717A] space-y-2 list-decimal list-inside">
                  <li>
                    Get a free API key at{' '}
                    <a
                      href="https://financialmodelingprep.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8B5CF6] hover:underline"
                    >
                      financialmodelingprep.com
                    </a>
                    {' '}(250 requests/day free)
                  </li>
                  <li>
                    Add <code className="bg-[#27272A] px-1.5 py-0.5 rounded text-[#A1A1AA]">FMP_API_KEY=your_key</code> to your .env.local file
                  </li>
                  <li>Restart the development server</li>
                </ol>
                <p className="text-xs text-[#52525B] mt-3">
                  Note: Yahoo Finance is used as a backup when FMP is unavailable.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show not found message
  if (!data.available) {
    return (
      <Card className="bg-[#0F0F14] border-[#27272A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#71717A]" />
            Public Financial Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[#141419]">
            <AlertCircle className="w-5 h-5 text-[#71717A] mt-0.5" />
            <div>
              <p className="text-sm text-[#A1A1AA]">No verified public financial records found</p>
              <p className="text-xs text-[#52525B] mt-1">
                This company may be privately held or not required to file public financial statements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = sourceConfig[data.source] || sourceConfig.None;
  const metrics = data.metrics;
  const hasRatios = metrics?.ratios && Object.values(metrics.ratios).some(v => v !== undefined);
  const hasGrowth = metrics?.growth && Object.values(metrics.growth).some(v => v !== undefined);
  const hasCashFlow = metrics?.ebitda || metrics?.operatingCashFlow || metrics?.freeCashFlow;
  const hasHistorical = metrics?.historicalRevenue && metrics.historicalRevenue.length > 1;

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#F5F5F7] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
            Public Financial Data
          </CardTitle>
          <Badge variant="outline" className={`${config.color} ${config.borderColor}`}>
            {config.badge}
          </Badge>
        </div>
        <p className="text-xs text-[#52525B] mt-1">{config.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className={`flex items-start gap-3 p-4 rounded-lg ${config.bgColor}`}>
          <CheckCircle2 className={`w-5 h-5 ${config.color} mt-0.5`} />
          <div>
            <p className={`text-sm font-medium ${config.color}`}>
              {data.message}
            </p>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Click the links below to view official financial filings
            </p>
          </div>
        </div>

        {/* Company Info */}
        <div className="flex flex-wrap gap-4 text-sm">
          {data.ticker && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141419]">
              <TrendingUp className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">Ticker:</span>
              <span className="text-[#F5F5F7] font-mono font-semibold">{data.ticker}</span>
            </div>
          )}
          {data.cik && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141419]">
              <Building2 className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">CIK:</span>
              <span className="text-[#F5F5F7] font-mono">{data.cik}</span>
            </div>
          )}
          {data.companyNumber && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#141419]">
              <Building2 className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">Company #:</span>
              <span className="text-[#F5F5F7] font-mono">{data.companyNumber}</span>
            </div>
          )}
        </div>

        {/* Key Financial Metrics */}
        {metrics && (metrics.revenue || metrics.netIncome || metrics.totalAssets) && (
          <div className="pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
              <h4 className="text-sm font-medium text-[#A1A1AA]">
                Key Financial Metrics
                {metrics.fiscalYear && (
                  <span className="text-[#52525B] font-normal ml-2">
                    (FY {metrics.fiscalYear})
                  </span>
                )}
              </h4>
              <Badge variant="outline" className={`${config.color} ${config.borderColor} ml-auto text-xs`}>
                {data.source === 'SEC' ? 'Verified' : 'Source: ' + data.source}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {metrics.revenue !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Revenue</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatCurrency(metrics.revenue, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.netIncome !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Net Income</p>
                  <p className={`text-lg font-semibold ${metrics.netIncome >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {formatCurrency(metrics.netIncome, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.grossProfit !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Gross Profit</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatCurrency(metrics.grossProfit, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.operatingIncome !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Operating Income</p>
                  <p className={`text-lg font-semibold ${metrics.operatingIncome >= 0 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    {formatCurrency(metrics.operatingIncome, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.totalAssets !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Total Assets</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatCurrency(metrics.totalAssets, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.totalEquity !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Shareholders&apos; Equity</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatCurrency(metrics.totalEquity, metrics.currency)}
                  </p>
                </div>
              )}
              {metrics.eps !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">EPS</p>
                  <p className={`text-lg font-semibold ${metrics.eps >= 0 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    ${metrics.eps.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EBITDA & Cash Flow */}
        {hasCashFlow && (
          <div className="pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#22C55E]" />
              <h4 className="text-sm font-medium text-[#A1A1AA]">EBITDA & Cash Flow</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics?.ebitda !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">EBITDA</p>
                  <p className={`text-lg font-semibold ${metrics.ebitda >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {formatCurrency(metrics.ebitda, metrics?.currency)}
                  </p>
                </div>
              )}
              {metrics?.operatingCashFlow !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Operating Cash Flow</p>
                  <p className={`text-lg font-semibold ${metrics.operatingCashFlow >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {formatCurrency(metrics.operatingCashFlow, metrics?.currency)}
                  </p>
                </div>
              )}
              {metrics?.freeCashFlow !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Free Cash Flow</p>
                  <p className={`text-lg font-semibold ${metrics.freeCashFlow >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {formatCurrency(metrics.freeCashFlow, metrics?.currency)}
                  </p>
                </div>
              )}
              {metrics?.capitalExpenditures !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">CapEx</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {formatCurrency(metrics.capitalExpenditures, metrics?.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial Ratios */}
        {hasRatios && metrics?.ratios && (
          <div className="pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-4 h-4 text-[#8B5CF6]" />
              <h4 className="text-sm font-medium text-[#A1A1AA]">Key Ratios</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.ratios.grossMargin !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Gross Margin</p>
                  <p className="text-lg font-semibold text-[#F5F5F7]">
                    {(metrics.ratios.grossMargin * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.operatingMargin !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Operating Margin</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.operatingMargin >= 0 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    {(metrics.ratios.operatingMargin * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.netMargin !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Net Margin</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.netMargin >= 0 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    {(metrics.ratios.netMargin * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.ebitdaMargin !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">EBITDA Margin</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.ebitdaMargin >= 0 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    {(metrics.ratios.ebitdaMargin * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.returnOnEquity !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Return on Equity</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.returnOnEquity >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {(metrics.ratios.returnOnEquity * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.returnOnAssets !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Return on Assets</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.returnOnAssets >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {(metrics.ratios.returnOnAssets * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {metrics.ratios.debtToEquity !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Debt to Equity</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.debtToEquity <= 1 ? 'text-[#22C55E]' : metrics.ratios.debtToEquity <= 2 ? 'text-[#F5F5F7]' : 'text-[#EF4444]'}`}>
                    {formatRatio(metrics.ratios.debtToEquity)}x
                  </p>
                </div>
              )}
              {metrics.ratios.currentRatio !== undefined && (
                <div className="p-3 rounded-lg bg-[#141419] border border-[#27272A]">
                  <p className="text-xs text-[#71717A] mb-1">Current Ratio</p>
                  <p className={`text-lg font-semibold ${metrics.ratios.currentRatio >= 1 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {formatRatio(metrics.ratios.currentRatio)}x
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Growth Metrics */}
        {hasGrowth && metrics?.growth && (
          <div className="pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
              <h4 className="text-sm font-medium text-[#A1A1AA]">Year-over-Year Growth</h4>
            </div>
            <div className="flex flex-wrap gap-3">
              {metrics.growth.revenueGrowthYoY !== undefined && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141419] border border-[#27272A]">
                  <span className="text-xs text-[#71717A]">Revenue</span>
                  <div className="flex items-center gap-1">
                    {metrics.growth.revenueGrowthYoY >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                    )}
                    <span className={`text-sm font-semibold ${metrics.growth.revenueGrowthYoY >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {formatPercent(metrics.growth.revenueGrowthYoY)}
                    </span>
                  </div>
                </div>
              )}
              {metrics.growth.netIncomeGrowthYoY !== undefined && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141419] border border-[#27272A]">
                  <span className="text-xs text-[#71717A]">Net Income</span>
                  <div className="flex items-center gap-1">
                    {metrics.growth.netIncomeGrowthYoY >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                    )}
                    <span className={`text-sm font-semibold ${metrics.growth.netIncomeGrowthYoY >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {formatPercent(metrics.growth.netIncomeGrowthYoY)}
                    </span>
                  </div>
                </div>
              )}
              {metrics.growth.epsGrowthYoY !== undefined && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141419] border border-[#27272A]">
                  <span className="text-xs text-[#71717A]">EPS</span>
                  <div className="flex items-center gap-1">
                    {metrics.growth.epsGrowthYoY >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                    )}
                    <span className={`text-sm font-semibold ${metrics.growth.epsGrowthYoY >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {formatPercent(metrics.growth.epsGrowthYoY)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historical Revenue Trend */}
        {hasHistorical && metrics?.historicalRevenue && (
          <div className="pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
              <h4 className="text-sm font-medium text-[#A1A1AA]">Revenue History</h4>
            </div>
            <div className="flex items-end gap-2 h-24">
              {metrics.historicalRevenue.map((point, index) => {
                const maxRevenue = Math.max(...metrics.historicalRevenue!.map(p => p.value));
                const height = (point.value / maxRevenue) * 100;
                return (
                  <div key={point.year} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#8B5CF6] rounded-t transition-all hover:bg-[#A78BFA]"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${point.year}: ${formatCurrency(point.value, metrics?.currency)}`}
                    />
                    <span className="text-xs text-[#52525B]">{point.year}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-[#71717A]">
              <span>{formatCurrency(metrics.historicalRevenue[0].value, metrics?.currency)}</span>
              <span>{formatCurrency(metrics.historicalRevenue[metrics.historicalRevenue.length - 1].value, metrics?.currency)}</span>
            </div>
          </div>
        )}

        {/* Filing Links */}
        {data.filingLinks.length > 0 && (
          <div className="pt-4 border-t border-[#27272A]">
            <h4 className="text-sm font-medium text-[#A1A1AA] mb-3">Official Filings</h4>
            <div className="space-y-2">
              {data.filingLinks.slice(0, 5).map((filing, index) => (
                <a
                  key={index}
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#141419] hover:bg-[#1A1A21] transition-colors group border border-transparent hover:border-[#27272A]"
                >
                  <FileText className="w-5 h-5 text-[#8B5CF6]" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#F5F5F7] group-hover:text-white block truncate">
                      {filing.name}
                    </span>
                    {filing.date && (
                      <span className="text-xs text-[#52525B]">{filing.date}</span>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#52525B] group-hover:text-[#8B5CF6] flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="pt-4 border-t border-[#27272A]">
            <h4 className="text-sm font-medium text-[#A1A1AA] mb-3">AI Analysis</h4>
            <div className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-line bg-[#141419] p-4 rounded-lg">
              {aiAnalysis}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4 border-t border-[#27272A]">
          <p className="text-xs text-[#52525B]">
            {data.source === 'SEC'
              ? 'Financial metrics are sourced from verified SEC filings via Financial Modeling Prep. Always verify data directly from official filings for investment decisions.'
              : data.source === 'Yahoo Finance'
              ? 'Financial data sourced from Yahoo Finance. Verify with official SEC filings for investment decisions.'
              : 'We provide links to official filings. Please verify all financial data directly from the source.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
