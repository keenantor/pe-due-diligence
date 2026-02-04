'use client';

import { Badge } from '@/components/ui/badge';
import { CoverageLevel } from '@/lib/scanner/types';

interface HeadlineScoreProps {
  score: number;
  coverageLevel: CoverageLevel;
  companyName: string;
  domain: string;
}

const coverageLevelColors: Record<CoverageLevel, string> = {
  Excellent: 'border-[#6B7280] text-[#9CA3AF]',
  Good: 'border-[#6366F1] text-[#818CF8]',
  Moderate: 'border-[#8B5CF6] text-[#A78BFA]',
  Limited: 'border-[#A78BFA] text-[#C4B5FD]',
  Minimal: 'border-[#C4B5FD] text-[#DDD6FE]',
  None: 'border-[#52525B] text-[#71717A]',
};

export function HeadlineScore({
  score,
  coverageLevel,
  companyName,
  domain,
}: HeadlineScoreProps) {
  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-[#F5F5F7]">{companyName}</h2>
        <p className="text-sm text-[#71717A] font-mono">{domain}</p>
      </div>

      <div className="py-6">
        <p className="text-sm uppercase tracking-wider text-[#71717A] mb-2">
          Public Diligence Coverage
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-7xl font-bold text-[#F5F5F7] font-mono score-display">
            {score}
          </span>
          <span className="text-2xl text-[#52525B] font-light">/ 100</span>
        </div>
      </div>

      <Badge
        variant="outline"
        className={`px-4 py-1 text-sm font-medium ${coverageLevelColors[coverageLevel]}`}
      >
        {coverageLevel} Coverage
      </Badge>

      <p className="text-sm text-[#71717A] max-w-md mx-auto">
        {getCoverageDescription(coverageLevel)}
      </p>
    </div>
  );
}

function getCoverageDescription(level: CoverageLevel): string {
  switch (level) {
    case 'Excellent':
      return 'Strong public data availability. Standard validation diligence should be sufficient.';
    case 'Good':
      return 'Good public data coverage with some gaps. Focused research on missing areas recommended.';
    case 'Moderate':
      return 'Mixed public visibility. Several areas will require additional primary research.';
    case 'Limited':
      return 'Limited public footprint. Expect extended diligence timeline for comprehensive coverage.';
    case 'Minimal':
      return 'Very limited public data. Primary research will be required for most diligence areas.';
    case 'None':
      return 'No public data found. Full primary research required.';
  }
}
