import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function collectCareersSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain;
  let activeJobsFound = false;
  let jobCount = 0;

  if (SERPER_API_KEY) {
    try {
      // Search for job listings on major job boards
      const jobResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" jobs (site:linkedin.com/jobs OR site:indeed.com OR site:glassdoor.com OR site:lever.co OR site:greenhouse.io)`,
          num: 20,
        }),
      });

      const jobData = await jobResponse.json();
      const jobResults = jobData.organic || [];

      // Filter for actual job listings
      const validJobSites = [
        'linkedin.com/jobs',
        'indeed.com',
        'glassdoor.com/job',
        'lever.co',
        'greenhouse.io',
        'careers.',
        'jobs.',
      ];

      const jobListings = jobResults.filter((r: { link: string; title: string }) => {
        const link = r.link.toLowerCase();
        const title = r.title.toLowerCase();
        return (
          validJobSites.some((site) => link.includes(site)) &&
          (title.includes('job') ||
            title.includes('career') ||
            title.includes('hiring') ||
            title.includes('position') ||
            title.includes('opening'))
        );
      });

      activeJobsFound = jobListings.length > 0;
      jobCount = jobListings.length;

      if (activeJobsFound) {
        metadata.jobListings = jobListings.slice(0, 5).map(
          (r: { title: string; link: string }) => ({
            title: r.title,
            url: r.link,
          })
        );
      }
    } catch (e) {
      errors.push({
        code: 'JOBS_SEARCH_ERROR',
        message: `Job search failed: ${e}`,
        recoverable: true,
      });
    }
  }

  // Active job listings signal
  signals.push({
    id: 'active_jobs',
    name: 'Active Job Listings',
    description: 'Open positions on job boards',
    found: activeJobsFound,
    value: activeJobsFound
      ? `${jobCount} listing(s) found`
      : SERPER_API_KEY
        ? 'No listings found'
        : 'API key required',
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
