'use client';

import { ExternalLink, FileText, DollarSign, TrendingUp, Building2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FinancialData as FinancialDataType, formatCurrency } from '@/lib/scanner/collectors/financials';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface FinancialDataProps {
  data: FinancialDataType | undefined;
  aiAnalysis?: string;
}

const sourceConfig = {
  SEC: {
    badge: 'SEC EDGAR',
    color: 'text-[#6366F1]',
    borderColor: 'border-[#6366F1]/30',
    description: 'Verified from U.S. Securities and Exchange Commission filings',
  },
  'Companies House': {
    badge: 'UK Companies House',
    color: 'text-[#8B5CF6]',
    borderColor: 'border-[#8B5CF6]/30',
    description: 'Verified from UK Companies House registry',
  },
  'Public Filing': {
    badge: 'Public Filing',
    color: 'text-[#A78BFA]',
    borderColor: 'border-[#A78BFA]/30',
    description: 'From publicly available financial documents',
  },
  None: {
    badge: 'Not Available',
    color: 'text-[#71717A]',
    borderColor: 'border-[#71717A]/30',
    description: 'No verified public financial data found',
  },
};

export function FinancialDataDisplay({ data, aiAnalysis }: FinancialDataProps) {
  if (!data || !data.available) {
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
                Financial data is only displayed when verified from official sources (SEC, Companies House, etc.)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = sourceConfig[data.source];
  const latestRecord = data.records[0];

  // Prepare chart data - use red for negative values
  const chartData = latestRecord?.metrics
    ? [
        { name: 'Revenue', value: latestRecord.metrics.revenue, fill: (latestRecord.metrics.revenue ?? 0) < 0 ? '#F87171' : '#8B5CF6' },
        { name: 'Gross Profit', value: latestRecord.metrics.grossProfit, fill: (latestRecord.metrics.grossProfit ?? 0) < 0 ? '#F87171' : '#A78BFA' },
        { name: 'Operating Income', value: latestRecord.metrics.operatingIncome, fill: (latestRecord.metrics.operatingIncome ?? 0) < 0 ? '#F87171' : '#6366F1' },
        { name: 'Net Income', value: latestRecord.metrics.netIncome, fill: (latestRecord.metrics.netIncome ?? 0) < 0 ? '#F87171' : '#818CF8' },
      ].filter((d) => d.value !== undefined)
    : [];

  const balanceData = latestRecord?.metrics
    ? [
        { name: 'Total Assets', value: latestRecord.metrics.totalAssets, fill: '#8B5CF6' },
        { name: 'Total Liabilities', value: latestRecord.metrics.totalLiabilities, fill: '#A78BFA' },
      ].filter((d) => d.value !== undefined)
    : [];

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#F5F5F7] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#8B5CF6]" />
            Public Financial Data
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${config.color} ${config.borderColor}`}>
              {config.badge}
            </Badge>
            {latestRecord?.verified && (
              <Badge variant="outline" className="text-[#6B7280] border-[#6B7280]/30">
                Verified
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-[#52525B] mt-1">{config.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Company Info */}
        <div className="flex flex-wrap gap-4 text-sm">
          {data.ticker && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">Ticker:</span>
              <span className="text-[#F5F5F7] font-mono">{data.ticker}</span>
            </div>
          )}
          {data.cik && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">CIK:</span>
              <span className="text-[#F5F5F7] font-mono">{data.cik}</span>
            </div>
          )}
          {data.companyNumber && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#71717A]" />
              <span className="text-[#71717A]">Company #:</span>
              <span className="text-[#F5F5F7] font-mono">{data.companyNumber}</span>
            </div>
          )}
        </div>

        {/* Financial Metrics */}
        {latestRecord && latestRecord.metrics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Revenue"
                value={latestRecord.metrics.revenue}
                currency={latestRecord.currency}
              />
              <MetricCard
                label="Net Income"
                value={latestRecord.metrics.netIncome}
                currency={latestRecord.currency}
              />
              <MetricCard
                label="Total Assets"
                value={latestRecord.metrics.totalAssets}
                currency={latestRecord.currency}
              />
              <MetricCard
                label="Employees"
                value={latestRecord.metrics.employees}
                isCount
              />
            </div>

            {/* Income Chart */}
            {chartData.length > 0 && (
              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#A1A1AA] mb-4">Income Statement Metrics</h4>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCurrency(value, latestRecord.currency)}
                        tick={{ fill: '#71717A', fontSize: 11 }}
                        axisLine={{ stroke: '#27272A' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#A1A1AA', fontSize: 12 }}
                        axisLine={{ stroke: '#27272A' }}
                        width={110}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const num = value as number;
                          const formatted = formatCurrency(num, latestRecord.currency);
                          return [num < 0 ? `${formatted} (Loss)` : formatted, ''];
                        }}
                        contentStyle={{
                          backgroundColor: '#141419',
                          border: '1px solid #27272A',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#F5F5F7' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Balance Sheet Chart */}
            {balanceData.length > 0 && (
              <div className="pt-4">
                <h4 className="text-sm font-medium text-[#A1A1AA] mb-4">Balance Sheet Overview</h4>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={balanceData} layout="vertical">
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCurrency(value, latestRecord.currency)}
                        tick={{ fill: '#71717A', fontSize: 11 }}
                        axisLine={{ stroke: '#27272A' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#A1A1AA', fontSize: 12 }}
                        axisLine={{ stroke: '#27272A' }}
                        width={110}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const num = value as number;
                          const formatted = formatCurrency(num, latestRecord.currency);
                          return [num < 0 ? `${formatted} (Loss)` : formatted, ''];
                        }}
                        contentStyle={{
                          backgroundColor: '#141419',
                          border: '1px solid #27272A',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#F5F5F7' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {balanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <p className="text-xs text-[#52525B]">
              Period: {latestRecord.period} • Source: {latestRecord.source}
            </p>
          </>
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
                  className="flex items-center gap-2 p-2 rounded hover:bg-[#141419] transition-colors group"
                >
                  <FileText className="w-4 h-4 text-[#71717A]" />
                  <span className="text-sm text-[#A1A1AA] group-hover:text-[#F5F5F7] flex-1 truncate">
                    {filing.name}
                  </span>
                  {filing.date && (
                    <span className="text-xs text-[#52525B]">{filing.date}</span>
                  )}
                  <ExternalLink className="w-3 h-3 text-[#52525B] group-hover:text-[#8B5CF6]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="pt-4 border-t border-[#27272A]">
            <h4 className="text-sm font-medium text-[#A1A1AA] mb-3">AI Financial Analysis</h4>
            <div className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-line">
              {aiAnalysis}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="pt-4 border-t border-[#27272A]">
          <p className="text-xs text-[#52525B]">
            Financial data is sourced from official public filings only. This information is provided for
            informational purposes and should be independently verified. Past performance does not guarantee
            future results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  currency = 'USD',
  isCount = false,
}: {
  label: string;
  value: number | undefined;
  currency?: string;
  isCount?: boolean;
}) {
  const isNegative = value !== undefined && value < 0;
  const displayValue = value !== undefined
    ? isCount
      ? new Intl.NumberFormat('en-US').format(value)
      : formatCurrency(value, currency)
    : 'N/A';

  return (
    <div className="p-3 rounded-lg bg-[#141419]">
      <p className="text-xs text-[#52525B] mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-lg font-semibold font-mono ${isNegative ? 'text-[#F87171]' : 'text-[#F5F5F7]'}`}>
          {displayValue}
        </p>
        {isNegative && !isCount && (
          <span className="text-xs text-[#F87171]/70">(Loss)</span>
        )}
      </div>
    </div>
  );
}
