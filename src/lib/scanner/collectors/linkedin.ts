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
      // Run both searches in parallel for speed
      debugLog('Searching LinkedIn (parallel requests)');

      const [companyResponse, founderResponse] = await Promise.all([
        // Search for LinkedIn company page
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: `site:linkedin.com/company "${searchQuery}"`,
            num: 10,
          }),
        }),
        // Search for founders/leadership
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: `"${searchQuery}" (founder OR CEO) site:linkedin.com/in`,
            num: 10,
          }),
        }),
      ]);

      // Process company results
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const companyResults = companyData.organic || [];
        searchSucceeded = true;

        debugLog('Company search results', {
          count: companyResults.length,
          first: companyResults[0] ? { title: companyResults[0].title, link: companyResults[0].link } : null
        });

        // Find LinkedIn company page
        const linkedInResult = companyResults.find(
          (r: { link: string; title: string; snippet?: string }) => {
            const link = r.link.toLowerCase();
            return link.includes('linkedin.com/company/');
          }
        );

        if (linkedInResult) {
          linkedInFound = true;
          linkedInUrl = linkedInResult.link;
          metadata.linkedInUrl = linkedInUrl;
          metadata.linkedInTitle = linkedInResult.title;
          debugLog('LinkedIn company FOUND', { linkedInUrl });
        }
      }

      // Process founder results
      if (founderResponse.ok) {
        const founderData = await founderResponse.json();
        const founderResults = founderData.organic || [];

        debugLog('Founder search results', { count: founderResults.length });

        // Filter to relevant profiles
        const relevantProfiles = founderResults.filter(
          (r: { title: string; snippet?: string }) => {
            const title = (r.title || '').toLowerCase();
            const snippet = (r.snippet || '').toLowerCase();
            const query = searchQuery.toLowerCase();
            return title.includes(query) || snippet.includes(query);
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
