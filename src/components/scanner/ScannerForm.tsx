'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeUrl, isCompanyWebsite } from '@/lib/utils/url';

interface ScannerFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function ScannerForm({ onSubmit, isLoading }: ScannerFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a company website URL');
      return;
    }

    try {
      const normalized = normalizeUrl(url);

      if (!isCompanyWebsite(normalized)) {
        setError('Please enter a company website, not a social media profile');
        return;
      }

      onSubmit(normalized);
    } catch {
      setError('Please enter a valid website URL (e.g., acme.com)');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="Enter company website (e.g., stripe.com)"
            className="h-12 pl-4 pr-4 bg-[#1A1A21] border-[#27272A] text-[#F5F5F7] placeholder:text-[#52525B] focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20"
            disabled={isLoading}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="h-12 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Analyze Coverage
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400/80 pl-1">{error}</p>
      )}

      <p className="text-xs text-[#71717A] pl-1">
        We only analyze publicly available data. No login or payment required.
      </p>
    </form>
  );
}
