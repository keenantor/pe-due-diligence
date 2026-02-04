'use client';

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface AIInterpretationProps {
  interpretation: string | null;
  isLoading?: boolean;
}

export function AIInterpretation({
  interpretation,
  isLoading = false,
}: AIInterpretationProps) {
  if (!interpretation && !isLoading) {
    return null;
  }

  return (
    <Card className="bg-[#0F0F14] border-[#27272A]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#F5F5F7] flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
          AI-Enhanced Analysis
        </CardTitle>
        <p className="text-xs text-[#52525B] mt-1">
          Pre-Diligence Interpretation powered by Mistral AI
        </p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-[#71717A]">
              <div className="w-5 h-5 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
              <span>Generating analysis...</span>
            </div>
          </div>
        ) : interpretation ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold text-[#F5F5F7] mt-6 mb-3 pb-2 border-b border-[#27272A] first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium text-[#A1A1AA] mt-4 mb-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-[#A1A1AA] leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-1.5 mb-4 ml-1">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-sm text-[#A1A1AA] flex items-start gap-2">
                    <span className="text-[#8B5CF6] mt-1.5 text-xs">●</span>
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="text-[#F5F5F7] font-medium">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-[#A78BFA] not-italic">{children}</em>
                ),
              }}
            >
              {interpretation}
            </ReactMarkdown>
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t border-[#27272A]">
          <p className="text-xs text-[#52525B]">
            This analysis is AI-generated based on the scan results above. It provides context and insights but should not be used as the sole basis for investment decisions. Always conduct thorough independent verification.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
