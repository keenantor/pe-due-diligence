'use client';

import { useEffect, useState } from 'react';
import { Globe, Search, Users, Building2, FileText, Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface ScanProgressProps {
  progress: number;
  currentStep: string;
}

const scanSteps = [
  { icon: Globe, label: 'Website Analysis', description: 'Checking pages & content' },
  { icon: Search, label: 'Search Presence', description: 'Finding mentions & news' },
  { icon: Users, label: 'Leadership Info', description: 'LinkedIn & team data' },
  { icon: Building2, label: 'Company Data', description: 'Domain & verification' },
  { icon: FileText, label: 'Financial Records', description: 'SEC & public filings' },
  { icon: Brain, label: 'AI Analysis', description: 'Generating insights' },
];

export function ScanProgress({ currentStep }: ScanProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate through steps faster (every 1.5 seconds)
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % scanSteps.length;
        if (prev < scanSteps.length - 1) {
          setCompletedSteps((completed) =>
            completed.includes(prev) ? completed : [...completed, prev]
          );
        }
        return next;
      });
    }, 1500);

    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => {
      clearInterval(interval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-[#8B5CF6]/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-[#F5F5F7] mb-2">Analyzing Company</h2>
        <p className="text-sm text-[#A1A1AA]">{currentStep}</p>
      </div>

      {/* Animated progress bar */}
      <div className="relative">
        <div className="w-full bg-[#1A1A21] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.min(100, (completedSteps.length / scanSteps.length) * 100 + 15)}%`,
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-2 gap-3">
        {scanSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = activeStep === index;
          const Icon = step.icon;

          return (
            <div
              key={index}
              className={`
                relative flex items-center gap-3 p-4 rounded-xl border transition-all duration-500
                ${isActive
                  ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/50 scale-[1.02]'
                  : isCompleted
                    ? 'bg-[#141419] border-[#27272A]'
                    : 'bg-[#0F0F14] border-[#1A1A21]'
                }
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300
                ${isActive
                  ? 'bg-[#8B5CF6] text-white'
                  : isCompleted
                    ? 'bg-[#22C55E]/20 text-[#22C55E]'
                    : 'bg-[#1A1A21] text-[#52525B]'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isActive ? (
                  <Icon className="w-5 h-5 animate-pulse" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${isActive || isCompleted ? 'text-[#F5F5F7]' : 'text-[#71717A]'}`}>
                  {step.label}
                </p>
                <p className={`text-xs truncate ${isActive ? 'text-[#A78BFA]' : 'text-[#52525B]'}`}>
                  {isActive ? `In progress${dots}` : isCompleted ? '✓ Complete' : step.description}
                </p>
              </div>
              {isActive && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-ping" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status message with animated dots */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
          <span className="text-sm text-[#A78BFA]">
            Scanning 7 data sources{dots}
          </span>
        </div>
        <p className="text-xs text-[#52525B]">
          This typically takes 15-30 seconds
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
