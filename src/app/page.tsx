'use client';

import { useState } from 'react';
import { Search, Loader2, Shield, Globe, TrendingUp, FileText, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanProgress } from '@/components/scanner/ScanProgress';
import { ScanResults } from '@/components/results/ScanResults';
import { ScanResult } from '@/lib/scanner/types';
import { normalizeUrl, isCompanyWebsite } from '@/lib/utils/url';

type ScanState = 'idle' | 'scanning' | 'completed' | 'error';

export default function Home() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    if (!url.trim()) {
      setInputError('Please enter a company website URL');
      return;
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(url);
      if (!isCompanyWebsite(normalizedUrl)) {
        setInputError('Please enter a company website, not a social media profile');
        return;
      }
    } catch {
      setInputError('Please enter a valid website URL (e.g., acme.com)');
      return;
    }

    setScanState('scanning');
    setProgress(0);
    setCurrentStep('Analyzing company data...');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'failed') {
        throw new Error(data.error || 'Failed to complete scan');
      }

      if (data.status === 'completed' && data.result) {
        setResult(data.result);
        setScanState('completed');
      } else {
        throw new Error('Scan completed but no result returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setScanState('error');
    }
  };

  const handleNewScan = () => {
    setScanState('idle');
    setResult(null);
    setError(null);
    setProgress(0);
    setUrl('');
  };

  if (scanState === 'scanning') {
    return (
      <main className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-full max-w-xl px-4">
          <ScanProgress progress={progress} currentStep={currentStep} />
        </div>
      </main>
    );
  }

  if (scanState === 'error') {
    return (
      <main className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-full max-w-xl px-4 text-center">
          <div className="bg-[#7F1D1D]/10 border border-[#7F1D1D]/30 rounded-lg p-6 mb-6">
            <p className="text-[#FCA5A5]">{error}</p>
          </div>
          <button
            onClick={handleNewScan}
            className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (scanState === 'completed' && result) {
    return (
      <main className="min-h-screen bg-[#0B0B0F]">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <button
              onClick={handleNewScan}
              className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm underline underline-offset-4"
            >
              ← Scan another company
            </button>
          </div>
          <ScanResults result={result} />
        </div>
      </main>
    );
  }

  // Landing Page
  return (
    <main className="min-h-screen bg-[#0B0B0F]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#8B5CF6]/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#8B5CF6]/10 rounded-full blur-3xl opacity-20" />

        <div className="relative container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              <span className="text-sm text-[#A78BFA]">Free PE Due Diligence Tool</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-[#F5F5F7] max-w-4xl mx-auto leading-tight mb-6">
            Instant Public Data
            <span className="text-[#8B5CF6]"> Coverage Analysis</span>
            <br />for Private Equity
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[#71717A] text-center max-w-2xl mx-auto mb-10">
            Discover what publicly available data exists on any company before you begin formal diligence.
            SEC filings, leadership profiles, market presence — analyzed in seconds.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#52525B]" />
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setInputError(null);
                  }}
                  placeholder="Enter company website (e.g., stripe.com)"
                  className="h-14 pl-12 pr-4 bg-[#141419] border-[#27272A] text-[#F5F5F7] placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20 text-base"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Button
                type="submit"
                className="h-14 px-8 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-base transition-all hover:scale-[1.02]"
              >
                <Search className="w-5 h-5 mr-2" />
                Analyze
              </Button>
            </div>
            {inputError && (
              <p className="text-sm text-red-400/80 mt-3 text-center">{inputError}</p>
            )}
          </form>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#52525B]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>No login required</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Public data only</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Results in ~30 seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t border-[#1A1A21]">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#F5F5F7] mb-4">
            What You'll Discover
          </h2>
          <p className="text-[#71717A] text-center max-w-xl mx-auto mb-12">
            Comprehensive public data analysis across multiple dimensions
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="SEC & Financial Filings"
              description="Automatically pulls verified financial data from SEC EDGAR for public companies, with AI-powered analysis."
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Market Presence"
              description="Third-party mentions, news coverage, and search presence to validate external market validation."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Leadership Verification"
              description="LinkedIn presence, identifiable founders, and team visibility across public sources."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Digital Footprint"
              description="Website analysis, domain age, technology stack, and operational indicators."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="AI-Powered Insights"
              description="Comprehensive interpretation with industry context, competitive landscape, and risk indicators."
            />
            <FeatureCard
              icon={<Lock className="w-6 h-6" />}
              title="Coverage Score"
              description="Deterministic 0-100 score showing how much of a standard diligence checklist can be informed publicly."
            />
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="border-t border-[#1A1A21] bg-[#0A0A0E]">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#F5F5F7] mb-12">
            How It Works
          </h2>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-4 max-w-4xl mx-auto">
            <StepCard number={1} title="Enter URL" description="Paste any company website" />
            <div className="hidden md:block w-12 h-px bg-[#27272A]" />
            <StepCard number={2} title="We Scan" description="7 data sources analyzed" />
            <div className="hidden md:block w-12 h-px bg-[#27272A]" />
            <StepCard number={3} title="Get Report" description="AI-enhanced analysis" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1A1A21]">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-xs text-[#52525B]">
            This tool analyzes publicly available data only. It does not estimate revenue, valuation, or financial performance.
            Results are for informational purposes and should not be used as the sole basis for investment decisions.
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl bg-[#0F0F14] border border-[#1A1A21] hover:border-[#27272A] transition-colors">
      <div className="w-12 h-12 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#F5F5F7] mb-2">{title}</h3>
      <p className="text-sm text-[#71717A] leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white font-bold text-lg mb-3">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-[#F5F5F7] mb-1">{title}</h3>
      <p className="text-sm text-[#52525B]">{description}</p>
    </div>
  );
}
