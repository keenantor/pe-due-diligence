'use client';

import { Loader2 } from 'lucide-react';

interface ScanProgressProps {
  progress: number;
  currentStep: string;
}

export function ScanProgress({ progress, currentStep }: ScanProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-center gap-3 text-[#A1A1AA]">
        <Loader2 className="w-5 h-5 animate-spin text-[#8B5CF6]" />
        <span className="text-sm">{currentStep}</span>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-[#1A1A21] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#8B5CF6] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-center text-[#52525B]">
          {progress}% complete
        </p>
      </div>
    </div>
  );
}
