import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Debug logging for Vercel
const DEBUG = true;
function debugLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[Careers Collector] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

export async function collectCareersSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain;
  const domainName = domain?.replace(/\.(com|io|co|org|net|ai)$/, '') || '';
  let activeJobsFound = false;
  let jobCount = 0;
  let apiAvailable = !!SERPER_API_KEY;
  let searchSucceeded = false;

  debugLog('Starting careers collection', {
    companyName,
    domain,
    searchQuery,
    apiKeyPresent: !!SERPER_API_KEY
  });

  if (SERPER_API_KEY) {
    try {
      // Search for job listings on major job boards - use simpler, more effective query
      debugLog('Searching LinkedIn jobs');
      const jobResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" site:linkedin.com/jobs`,
          num: 10,
        }),
      });

      if (!jobResponse.ok) {
        throw new Error(`Serper API returned ${jobResponse.status}`);
      }

      const jobData = await jobResponse.json();
      let jobResults = jobData.organic || [];
      searchSucceeded = true;

      // Also search other job boards
      const otherJobsResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" (site:indeed.com OR site:glassdoor.com OR site:lever.co OR site:greenhouse.io OR site:workday.com)`,
          num: 10,
        }),
      });

      if (otherJobsResponse.ok) {
        const otherJobData = await otherJobsResponse.json();
        jobResults = [...jobResults, ...(otherJobData.organic || [])];
      }

      // Also try company's own careers page
      if (domain) {
        const careersResponse = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: `site:${domain} (careers OR jobs OR "open positions" OR "we're hiring")`,
            num: 5,
          }),
        });

        if (careersResponse.ok) {
          const careersData = await careersResponse.json();
          jobResults = [...jobResults, ...(careersData.organic || [])];
        }
      }

      // Valid job board domains - be more inclusive
      const validJobSites = [
        'linkedin.com/jobs',
        'linkedin.com/company',
        'indeed.com',
        'glassdoor.com',
        'lever.co',
        'greenhouse.io',
        'workday.com',
        'smartrecruiters.com',
        'jobvite.com',
        'icims.com',
        'myworkdayjobs.com',
        '/careers',
        '/jobs',
        '/career',
        '/job',
      ];

      // Filter for job-related results - be less restrictive on title matching
      const jobListings = jobResults.filter((r: { link: string; title: string; snippet?: string }) => {
        const link = r.link.toLowerCase();
        const title = (r.title || '').toLowerCase();
        const snippet = (r.snippet || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        const domainLower = domainName.toLowerCase();

        // Check if it's from a valid job site or company careers page
        const isJobSite = validJobSites.some((site) => link.includes(site));

        // Check if result mentions the company
        const mentionsCompany =
          title.includes(query) ||
          title.includes(domainLower) ||
          snippet.includes(query) ||
          snippet.includes(domainLower);

        return isJobSite && mentionsCompany;
      });

      // Remove duplicates based on URL
      const uniqueListings = jobListings.filter(
        (r: { link: string }, index: number, self: { link: string }[]) =>
          index === self.findIndex((t) => t.link === r.link)
      );

      activeJobsFound = uniqueListings.length > 0;
      jobCount = uniqueListings.length;

      debugLog('Job search results', {
        totalResults: jobResults.length,
        filteredCount: jobListings.length,
        uniqueCount: uniqueListings.length,
        sampleListings: uniqueListings.slice(0, 3).map((r: { title: string; link: string }) => ({
          title: r.title,
          link: r.link
        }))
      });

      if (activeJobsFound) {
        metadata.jobListings = uniqueListings.slice(0, 10).map(
          (r: { title: string; link: string }) => ({
            title: r.title,
            url: r.link,
          })
        );
      }
    } catch (e) {
      errors.push({
        code: 'JOBS_SEARCH_ERROR',
        message: `Job search failed: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      });
      searchSucceeded = false;
    }
  } else {
    debugLog('SERPER_API_KEY not available - cannot search for jobs');
  }

  debugLog('Final results', { activeJobsFound, jobCount, searchSucceeded, apiAvailable });

  // Determine status message
  const getStatusMessage = () => {
    if (!apiAvailable) return 'Unable to verify (API key not configured)';
    if (!searchSucceeded) return 'Unable to verify (search failed)';
    return 'No listings found in search results';
  };

  // Active job listings signal
  signals.push({
    id: 'active_jobs',
    name: 'Active Job Listings',
    description: 'Open positions on job boards',
    found: activeJobsFound,
    value: activeJobsFound ? `${jobCount} listing(s) found` : getStatusMessage(),
    source: 'Job board search',
    category: 'operational',
    points: activeJobsFound ? 4 : 0,
    maxPoints: 4,
  });

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
