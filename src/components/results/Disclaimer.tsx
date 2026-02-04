'use client';

import { AlertTriangle } from 'lucide-react';
import { DISCLAIMER_TEXT } from '@/lib/scanner/constants';

export function Disclaimer() {
  return (
    <div className="rounded-lg bg-[#0F0F14] border border-[#27272A] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#71717A] shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#A1A1AA]">Disclaimer</h4>
          <div className="text-xs text-[#71717A] whitespace-pre-line leading-relaxed">
            {DISCLAIMER_TEXT}
          </div>
        </div>
      </div>
    </div>
  );
}
