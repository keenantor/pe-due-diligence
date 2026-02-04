'use client';

import { Loader2, Globe, Search, Users, Building2, FileText, Brain } from 'lucide-react';

interface ScanProgressProps {
  progress: number;
  currentStep: string;
}

const scanSteps = [
  { icon: Globe, label: 'Analyzing website' },
  { icon: Search, label: 'Checking search presence' },
  { icon: Users, label: 'Finding leadership info' },
  { icon: Building2, label: 'Verifying company data' },
  { icon: FileText, label: 'Looking for financials' },
  { icon: Brain, label: 'Generating AI analysis' },
];

export function ScanProgress({ currentStep }: ScanProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#8B5CF6] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#F5F5F7] mb-2">Analyzing Company</h2>
        <p className="text-sm text-[#A1A1AA]">{currentStep}</p>
      </div>

      {/* Animated progress bar */}
      <div className="w-full bg-[#1A1A21] h-2 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#8B5CF6] animate-pulse rounded-full w-full" />
      </div>

      {/* Steps being analyzed */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        {scanSteps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#141419] animate-pulse"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            <step.icon className="w-5 h-5 text-[#8B5CF6]" />
            <span className="text-xs text-[#52525B] text-center">{step.label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-[#52525B]">
        This usually takes 15-30 seconds
      </p>
    </div>
  );
}
