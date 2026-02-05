'use client';

import { useEffect, useState, useRef } from 'react';
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

// Simulated terminal output lines
const terminalLines = [
  { text: 'Initializing scan...', delay: 0 },
  { text: 'Resolving DNS records', delay: 400 },
  { text: 'GET https://target.com/ 200 OK', delay: 800 },
  { text: 'Parsing HTML content...', delay: 1200 },
  { text: 'Extracting metadata', delay: 1600 },
  { text: 'GET /api/linkedin/search 200 OK', delay: 2200 },
  { text: 'Scanning leadership profiles...', delay: 2800 },
  { text: 'GET /api/serper/news 200 OK', delay: 3400 },
  { text: 'Analyzing press coverage', delay: 3800 },
  { text: 'GET /api/domain/whois 200 OK', delay: 4400 },
  { text: 'Validating domain age...', delay: 4800 },
  { text: 'GET /api/sec/edgar 200 OK', delay: 5400 },
  { text: 'Parsing financial records', delay: 5800 },
  { text: 'GET /api/jobs/search 200 OK', delay: 6400 },
  { text: 'Counting active listings...', delay: 6800 },
  { text: 'Running tech stack detection', delay: 7400 },
  { text: 'Analyzing SSL certificate', delay: 7800 },
  { text: 'Computing coverage score...', delay: 8400 },
  { text: 'Generating AI interpretation', delay: 9000 },
  { text: 'Compiling final report...', delay: 9600 },
];

export function ScanProgress({ currentStep }: ScanProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Cycle through steps
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < scanSteps.length - 1) {
          setCompletedSteps((c) => (c.includes(prev) ? c : [...c, prev]));
        }
        return (prev + 1) % scanSteps.length;
      });
    }, 2500);

    return () => clearInterval(stepTimer);
  }, []);

  // Add terminal lines progressively
  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) {
      // Loop back with new variations
      const loopTimer = setTimeout(() => {
        setCurrentLineIndex(0);
        setVisibleLines([]);
      }, 3000);
      return () => clearTimeout(loopTimer);
    }

    const line = terminalLines[currentLineIndex];
    const timer = setTimeout(() => {
      setVisibleLines((prev) => {
        const newLines = [...prev, line.text];
        // Keep only last 8 lines
        return newLines.slice(-8);
      });
      setCurrentLineIndex((prev) => prev + 1);
    }, currentLineIndex === 0 ? 500 : 500);

    return () => clearTimeout(timer);
  }, [currentLineIndex]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 p-4">
      {/* Header with spinner */}
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Analyzing Company</h2>
        <p className="text-gray-400 text-sm">{currentStep}</p>
      </div>

      {/* Terminal Animation */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
          </div>
          <span className="text-xs text-gray-500 ml-2 font-mono">diligence-scanner</span>
        </div>

        {/* Terminal content */}
        <div
          ref={terminalRef}
          className="p-4 h-48 overflow-y-auto font-mono text-sm"
        >
          {visibleLines.map((line, index) => (
            <div
              key={index}
              className="flex items-start gap-2 mb-1 animate-fadeIn"
            >
              <span className="text-green-500 select-none">{'>'}</span>
              <span className={`${
                line.includes('200 OK')
                  ? 'text-green-400'
                  : line.includes('GET') || line.includes('POST')
                    ? 'text-blue-400'
                    : 'text-gray-300'
              }`}>
                {line}
              </span>
            </div>
          ))}
          {/* Blinking cursor */}
          <div className="flex items-center gap-2">
            <span className="text-green-500 select-none">{'>'}</span>
            <span className="w-2 h-4 bg-green-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Steps grid - more compact */}
      <div className="grid grid-cols-3 gap-2">
        {scanSteps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = activeStep === index;
          const StepIcon = step.icon;

          return (
            <div
              key={index}
              className={`
                flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-300
                ${isActive ? 'bg-purple-500/20 border-purple-500/50 scale-105' : ''}
                ${isCompleted ? 'bg-gray-800/50 border-gray-700' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-900/50 border-gray-800' : ''}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${isActive ? 'bg-purple-500 text-white' : ''}
                  ${isCompleted ? 'bg-green-500/20 text-green-400' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-800 text-gray-500' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <StepIcon className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <p className={`text-xs text-center ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Bottom status */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-purple-300 text-sm">Scanning 7 data sources</span>
        </div>
      </div>
    </div>
  );
}
