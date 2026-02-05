import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Add delay for more reliable API responses
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function collectCareersSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain || '';
  let activeJobsFound = false;
  let jobCount = 0;
  let apiAvailable = !!SERPER_API_KEY;

  if (SERPER_API_KEY && searchQuery) {
    try {
      // Search for job listings
      console.log(`[Careers] Searching for jobs at: "${searchQuery}"`);

      const jobResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} jobs careers hiring`,
          num: 20,
        }),
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        const results = jobData.organic || [];

        console.log(`[Careers] Got ${results.length} results`);

        // Look for job board results
        const jobBoardDomains = [
          'linkedin.com/jobs',
          'linkedin.com/company',
          'indeed.com',
          'glassdoor.com',
          'lever.co',
          'greenhouse.io',
          'workday.com',
          'smartrecruiters.com',
          'careers.',
          '/careers',
          '/jobs',
        ];

        const jobListings: { title: string; url: string }[] = [];

        for (const result of results) {
          const link = (result.link || '').toLowerCase();
          const title = result.title || '';

          // Check if it's from a job-related site
          const isJobSite = jobBoardDomains.some(d => link.includes(d));

          if (isJobSite) {
            jobListings.push({ title, url: result.link });
          }
        }

        if (jobListings.length > 0) {
          activeJobsFound = true;
          jobCount = jobListings.length;
          metadata.jobListings = jobListings.slice(0, 10);
          console.log(`[Careers] FOUND ${jobCount} job listings`);
        }
      }

      // Wait before potential additional requests
      await delay(300);

    } catch (e) {
      console.error(`[Careers] Error:`, e);
      errors.push({
        code: 'JOBS_SEARCH_ERROR',
        message: `Job search failed: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      });
    }
  }

  // Build signal
  signals.push({
    id: 'active_jobs',
    name: 'Active Job Listings',
    description: 'Open positions on job boards',
    found: activeJobsFound,
    value: activeJobsFound
      ? `${jobCount} listing(s) found`
      : (apiAvailable ? 'No listings found' : 'API key required'),
    source: 'Job board search',
    category: 'operational',
    points: activeJobsFound ? 4 : 0,
    maxPoints: 4,
  });

  console.log(`[Careers] Complete - found: ${activeJobsFound}, count: ${jobCount}`);

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
