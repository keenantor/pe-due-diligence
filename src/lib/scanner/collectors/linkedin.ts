import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Debug logging for Vercel
const DEBUG = true;
function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[LinkedIn Collector] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export async function collectLinkedInSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain;
  // Also search by domain without TLD for better matching
  const domainName = domain?.replace(/\.(com|io|co|org|net|ai)$/, '') || '';

  // LinkedIn company page detection
  let linkedInFound = false;
  let linkedInUrl: string | undefined;
  let foundersFound = false;
  let apiAvailable = !!SERPER_API_KEY;
  let searchSucceeded = false;

  debugLog('Starting LinkedIn collection', {
    companyName,
    domain,
    searchQuery,
    domainName,
    apiKeyPresent: !!SERPER_API_KEY,
    apiKeyLength: SERPER_API_KEY?.length
  });

  if (SERPER_API_KEY) {
    try {
      // Search for LinkedIn company page with multiple query strategies
      const query = `site:linkedin.com/company (${searchQuery} OR ${domainName})`;
      debugLog('Searching LinkedIn with query', { query });

      const companyResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `site:linkedin.com/company (${searchQuery} OR ${domainName})`,
          num: 10,
        }),
      });

      if (!companyResponse.ok) {
        const errorText = await companyResponse.text();
        debugLog('Serper API error', { status: companyResponse.status, error: errorText });
        throw new Error(`Serper API returned ${companyResponse.status}: ${errorText}`);
      }

      const companyData = await companyResponse.json();
      const companyResults = companyData.organic || [];
      searchSucceeded = true;

      debugLog('Serper API response', {
        resultsCount: companyResults.length,
        results: companyResults.slice(0, 3).map((r: { link: string; title: string }) => ({
          title: r.title,
          link: r.link
        }))
      });

      // Look for LinkedIn company pages - be more flexible with matching
      const linkedInResult = companyResults.find(
        (r: { link: string; title: string; snippet?: string }) => {
          const link = r.link.toLowerCase();
          const title = (r.title || '').toLowerCase();
          const snippet = (r.snippet || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          const domainLower = domainName.toLowerCase();

          // Must be a LinkedIn company page
          if (!link.includes('linkedin.com/company/')) return false;

          // Check if title, snippet, or URL contains company name or domain
          return (
            title.includes(query) ||
            title.includes(domainLower) ||
            snippet.includes(query) ||
            snippet.includes(domainLower) ||
            link.includes(domainLower)
          );
        }
      );

      debugLog('LinkedIn result matching', { linkedInResult: linkedInResult ? { title: linkedInResult.title, link: linkedInResult.link } : null });

      if (linkedInResult) {
        linkedInFound = true;
        linkedInUrl = linkedInResult.link;
        metadata.linkedInUrl = linkedInUrl;
        metadata.linkedInTitle = linkedInResult.title;
        debugLog('LinkedIn company FOUND', { linkedInUrl });
      } else {
        debugLog('LinkedIn company NOT FOUND - no matching results');
      }

      // Search for founders/leadership on LinkedIn with better queries
      const founderResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" (founder OR CEO OR "co-founder" OR "chief executive" OR president) site:linkedin.com/in`,
          num: 15,
        }),
      });

      if (founderResponse.ok) {
        const founderData = await founderResponse.json();
        const founderResults = founderData.organic || [];

        // Filter to profiles that actually mention the company
        const relevantProfiles = founderResults.filter(
          (r: { title: string; snippet?: string }) => {
            const title = (r.title || '').toLowerCase();
            const snippet = (r.snippet || '').toLowerCase();
            const query = searchQuery.toLowerCase();
            const domainLower = domainName.toLowerCase();
            return (
              title.includes(query) ||
              title.includes(domainLower) ||
              snippet.includes(query) ||
              snippet.includes(domainLower)
            );
          }
        );

        foundersFound = relevantProfiles.length > 0;
        if (foundersFound) {
          metadata.founderProfiles = relevantProfiles.slice(0, 5).map(
            (r: { title: string; link: string }) => ({
              name: r.title,
              url: r.link,
            })
          );
        }
      }
    } catch (e) {
      errors.push({
        code: 'LINKEDIN_SEARCH_ERROR',
        message: `LinkedIn search failed: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      });
      searchSucceeded = false;
    }
  } else {
    debugLog('SERPER_API_KEY not available - cannot search');
  }

  debugLog('Final results', { linkedInFound, foundersFound, searchSucceeded, apiAvailable });

  // Determine the status message based on what happened
  const getStatusMessage = (found: boolean, defaultValue?: string) => {
    if (found) return defaultValue;
    if (!apiAvailable) return 'Unable to verify (API key not configured)';
    if (!searchSucceeded) return 'Unable to verify (search failed)';
    return 'Not found in search results';
  };

  // LinkedIn company page signal
  signals.push({
    id: 'linkedin_company',
    name: 'LinkedIn Company Page',
    description: 'Company has LinkedIn presence',
    found: linkedInFound,
    value: linkedInFound ? linkedInUrl : getStatusMessage(linkedInFound),
    source: 'Search engine lookup',
    category: 'leadership',
    points: linkedInFound ? 6 : 0,
    maxPoints: 6,
  });

  // Founders identifiable signal
  signals.push({
    id: 'founders_identifiable',
    name: 'Founders/CEO Identifiable',
    description: 'Leadership names discoverable online',
    found: foundersFound,
    value: foundersFound
      ? `${(metadata.founderProfiles as unknown[])?.length || 0} profile(s) found`
      : getStatusMessage(foundersFound),
    source: 'Search engine lookup',
    category: 'leadership',
    points: foundersFound ? 6 : 0,
    maxPoints: 6,
  });

  // Employee count - this would need LinkedIn API or scraping
  signals.push({
    id: 'employee_count',
    name: 'Employee Count Available',
    description: 'Employee range discoverable',
    found: false,
    value: 'Requires LinkedIn API access',
    source: 'LinkedIn or website',
    category: 'leadership',
    points: 0,
    maxPoints: 4,
  });

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
