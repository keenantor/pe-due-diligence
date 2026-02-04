'use client';

import { Check, X, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Signal } from '@/lib/scanner/types';

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  const foundSignals = signals.filter((s) => s.found);
  const missingSignals = signals.filter((s) => !s.found);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-[#0F0F14] border-[#27272A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
            <Check className="w-4 h-4 text-[#6B7280]" />
            Signals Found ({foundSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {foundSignals.length === 0 ? (
            <p className="text-sm text-[#52525B] py-4 text-center">
              No signals detected
            </p>
          ) : (
            foundSignals.map((signal) => (
              <SignalItem key={signal.id} signal={signal} />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#0F0F14] border-[#27272A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-[#F5F5F7] flex items-center gap-2">
            <X className="w-4 h-4 text-[#52525B]" />
            Signals Not Found ({missingSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {missingSignals.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-4 text-center">
              All signals found
            </p>
          ) : (
            missingSignals.map((signal) => (
              <SignalItem key={signal.id} signal={signal} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignalItem({ signal }: { signal: Signal }) {
  return (
    <div
      className={`py-2 px-3 rounded text-sm ${
        signal.found ? 'bg-[#141419]' : 'bg-[#0F0F14]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <span className={signal.found ? 'text-[#A1A1AA]' : 'text-[#52525B]'}>
            {signal.name}
          </span>
          {signal.value && (
            <p className="text-xs text-[#71717A] font-mono mt-1">
              {signal.value}
            </p>
          )}
        </div>
        <span className="text-xs text-[#52525B] shrink-0">{signal.source}</span>
      </div>
    </div>
  );
}
