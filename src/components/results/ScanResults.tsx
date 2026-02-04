'use client';

import { ScanResult } from '@/lib/scanner/types';
import { HeadlineScore } from './HeadlineScore';
import { CoverageBreakdown } from './CoverageBreakdown';
import { SignalList } from './SignalList';
import { Penalties } from './Penalties';
import { NextSteps } from './NextSteps';
import { AIInterpretation } from './AIInterpretation';
import { FinancialDataDisplay } from './FinancialData';
import { Disclaimer } from './Disclaimer';

interface ScanResultsProps {
  result: ScanResult;
}

export function ScanResults({ result }: ScanResultsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Headline Score */}
      <div className="bg-[#0F0F14] border border-[#27272A] rounded-lg p-8">
        <HeadlineScore
          score={result.score}
          coverageLevel={result.coverageLevel}
          companyName={result.companyName}
          domain={result.domain}
        />
      </div>

      {/* AI Interpretation - Primary analysis */}
      {result.aiInterpretation && (
        <AIInterpretation interpretation={result.aiInterpretation} />
      )}

      {/* Public Financial Data */}
      <FinancialDataDisplay
        data={result.financialData}
        aiAnalysis={result.financialAnalysis}
      />

      {/* Coverage Breakdown */}
      <CoverageBreakdown categories={result.categories} />

      {/* Signals Found / Not Found */}
      <div>
        <h3 className="text-lg font-semibold text-[#F5F5F7] mb-4">
          Verified Public Signals
        </h3>
        <SignalList signals={result.signals} />
      </div>

      {/* Penalties */}
      {result.penalties.some((p) => p.applied) && (
        <Penalties
          penalties={result.penalties}
          totalPenalty={result.totalPenalty}
        />
      )}

      {/* Next Steps - Actionable checklist based on gaps */}
      <NextSteps
        signals={result.signals}
        categories={result.categories}
        companyName={result.companyName}
        domain={result.domain}
      />

      {/* Disclaimer */}
      <Disclaimer />

      {/* Metadata */}
      <div className="text-xs text-[#52525B] text-center space-y-1">
        <p>
          Scan completed in {(result.duration / 1000).toFixed(1)}s on{' '}
          {new Date(result.timestamp).toLocaleString()}
        </p>
        <p>Job ID: {result.jobId}</p>
      </div>
    </div>
  );
}
