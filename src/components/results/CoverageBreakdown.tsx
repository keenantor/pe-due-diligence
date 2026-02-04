'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryScore, CoverageLevel } from '@/lib/scanner/types';
import { CATEGORY_INFO } from '@/lib/scanner/constants';

interface CoverageBreakdownProps {
  categories: CategoryScore[];
}

const coverageLevelColors: Record<CoverageLevel, string> = {
  Excellent: 'text-[#9CA3AF]',
  Good: 'text-[#818CF8]',
  Moderate: 'text-[#A78BFA]',
  Limited: 'text-[#C4B5FD]',
  Minimal: 'text-[#DDD6FE]',
  None: 'text-[#71717A]',
};

const progressBarColors: Record<CoverageLevel, string> = {
  Excellent: 'bg-[#6B7280]',
  Good: 'bg-[#6366F1]',
  Moderate: 'bg-[#8B5CF6]',
  Limited: 'bg-[#A78BFA]',
  Minimal: 'bg-[#C4B5FD]',
  None: 'bg-[#52525B]',
};

export function CoverageBreakdown({ categories }: CoverageBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-[#F5F5F7]">
          Coverage Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.category;
          const percentage = Math.round((category.score / category.maxScore) * 100);
          const categoryInfo = CATEGORY_INFO[category.category];

          return (
            <div key={category.category} className="border-b border-[#27272A] last:border-0">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
                className="w-full py-4 flex items-center gap-4 hover:bg-[#141419] transition-colors rounded px-2 -mx-2"
              >
                <span className="text-[#71717A]">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>

                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#F5F5F7]">
                      {categoryInfo.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${coverageLevelColors[category.coverageLevel]}`}>
                        {category.coverageLevel}
                      </span>
                      <span className="text-sm font-mono text-[#71717A]">
                        {category.score}/{category.maxScore}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-[#1A1A21] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${progressBarColors[category.coverageLevel]} transition-none`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="pb-4 pl-10 pr-4 space-y-2">
                  <p className="text-sm text-[#71717A] mb-3">
                    {categoryInfo.description}
                  </p>
                  {category.signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="flex items-center justify-between py-2 px-3 rounded bg-[#141419]"
                    >
                      <div className="flex items-center gap-3">
                        {signal.found ? (
                          <Check className="w-4 h-4 text-[#6B7280]" />
                        ) : (
                          <X className="w-4 h-4 text-[#52525B]" />
                        )}
                        <span className={signal.found ? 'text-[#A1A1AA]' : 'text-[#52525B]'}>
                          {signal.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {signal.value && (
                          <span className="text-xs text-[#71717A] font-mono">
                            {signal.value}
                          </span>
                        )}
                        <span className="text-xs text-[#52525B] font-mono">
                          +{signal.found ? signal.points : 0}/{signal.maxPoints}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
