'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Penalty } from '@/lib/scanner/types';

interface PenaltiesProps {
  penalties: Penalty[];
  totalPenalty: number;
}

export function Penalties({ penalties, totalPenalty }: PenaltiesProps) {
  const appliedPenalties = penalties.filter((p) => p.applied);

  if (appliedPenalties.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#A78BFA]" />
            Risk / Absence Penalties
          </span>
          <span className="text-sm font-mono text-[#A78BFA]">
            {totalPenalty} pts
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {appliedPenalties.map((penalty) => (
          <div
            key={penalty.id}
            className="flex items-start justify-between gap-4 py-2 px-3 rounded bg-[#141419]"
          >
            <div className="flex-1">
              <p className="text-sm text-[#A1A1AA]">{penalty.name}</p>
              <p className="text-xs text-[#52525B] mt-0.5">
                {penalty.description}
              </p>
              {penalty.reason && (
                <p className="text-xs text-[#71717A] mt-1 italic">
                  {penalty.reason}
                </p>
              )}
            </div>
            <span className="text-sm font-mono text-[#A78BFA] shrink-0">
              {penalty.points}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
