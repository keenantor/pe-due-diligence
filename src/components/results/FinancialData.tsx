'use client';

import { ExternalLink, FileText, DollarSign, TrendingUp, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FinancialData as FinancialDataType } from '@/lib/scanner/collectors/financials';

interface FinancialDataProps {
  data: FinancialDataType | undefined;
  aiAnalysis?: string;
}

const sourceConfig = {
  SEC: {
    badge: 'SEC EDGAR',
    color: 'text-[#6366F1]',
    borderColor: 'border-[#6366F1]/30',
    bgColor: 'bg-[#6366F1]/10',
    description: 'Verified from U.S. Securities and Exchange Commission filings',
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
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = sourceConfig[data.source];

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

        {/* Filing Links */}
        {data.filingLinks.length > 0 && (
          <div className="pt-2">
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
            We provide links to official filings only. Please verify all financial data directly from the source.
            This tool does not extract or display specific financial figures to ensure accuracy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
