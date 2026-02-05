'use client';

import { useEffect, useState } from 'react';
import { Globe, Search, Users, Building2, FileText, Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface ScanProgressProps {
  progress: number;
  currentStep: string;
}

const scanSteps = [
  { icon: Globe, label: 'Website Analysis', desc: 'Checking pages & content' },
  { icon: Search, label: 'Search Presence', desc: 'Finding mentions & news' },
  { icon: Users, label: 'Leadership Info', desc: 'LinkedIn & team data' },
  { icon: Building2, label: 'Company Data', desc: 'Domain & verification' },
  { icon: FileText, label: 'Financial Records', desc: 'SEC & public filings' },
  { icon: Brain, label: 'AI Analysis', desc: 'Generating insights' },
];

export function ScanProgress({ progress, currentStep }: ScanProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [dotCount, setDotCount] = useState(1);
  const [displayProgress, setDisplayProgress] = useState(() => Math.max(progress || 0, 5));

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < scanSteps.length - 1) {
          setCompletedSteps((c) => (c.includes(prev) ? c : [...c, prev]));
        }
        return (prev + 1) % scanSteps.length;
      });
    }, 1500);

    const dotTimer = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 400);

    // Animate the progress percentage smoothly
    const progressTimer = setInterval(() => {
      setDisplayProgress((prev) => {
        const current = typeof prev === 'number' && Number.isFinite(prev) ? prev : 5;
        if (current >= 95) return current; // Cap at 95% until complete
        return current + Math.random() * 3 + 1; // Random increment between 1-4%
      });
    }, 800);

    return () => {
      clearInterval(stepTimer);
      clearInterval(dotTimer);
      clearInterval(progressTimer);
    };
  }, []);

  const dots = '.'.repeat(dotCount);
  const progressPercent = Math.min(95, Math.round(displayProgress || 0)) || 0;

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 p-4">
      {/* Header with spinner */}
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Company</h2>
        <p className="text-gray-400">{currentStep}</p>
      </div>

      {/* Progress bar with percentage */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-2xl font-bold text-white tabular-nums">{Number.isFinite(progressPercent) ? progressPercent : 0}%</span>
        </div>
        <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>

      {/* Steps grid */}
      <div className="grid grid-cols-2 gap-3">
        {scanSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = activeStep === index;
          const StepIcon = step.icon;

          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-4 rounded-xl border transition-all duration-300
                ${isActive ? 'bg-purple-500/20 border-purple-500/50 scale-105' : ''}
                ${isCompleted ? 'bg-gray-800/50 border-gray-700' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-900/50 border-gray-800' : ''}
              `}
            >
              <div
                className={`
                  w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all
                  ${isActive ? 'bg-purple-500 text-white' : ''}
                  ${isCompleted ? 'bg-green-500/20 text-green-400' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-800 text-gray-500' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <StepIcon className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <div>
                <p className={`font-medium ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                <p className={`text-sm ${isActive ? 'text-purple-300' : 'text-gray-600'}`}>
                  {isActive ? `Working${dots}` : isCompleted ? '✓ Done' : step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom status */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-purple-500/10 border border-purple-500/30">
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-purple-300 font-medium">Scanning 7 data sources{dots}</span>
        </div>

        <p className="text-gray-500 text-sm">Usually takes 15-30 seconds</p>

        <div className="flex justify-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-3 h-3 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
