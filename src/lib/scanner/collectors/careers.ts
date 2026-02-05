import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Verify a URL actually exists
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);
    return response.ok || response.status === 403;
  } catch {
    return false;
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

  const searchQuery = companyName || domain || '';
  let activeJobsFound = false;
  let jobCount = 0;
  let apiAvailable = !!SERPER_API_KEY;

  if (SERPER_API_KEY && searchQuery) {
    try {
      console.log(`[Careers] Starting thorough job search for: "${searchQuery}"`);

      // ========== STEP 1: Search LinkedIn Jobs ==========
      console.log(`[Careers] Step 1: Searching LinkedIn Jobs...`);
      await delay(1000);

      const linkedInJobsResponse = await fetch('https://google.serper.dev/search', {
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

      const allJobListings: { title: string; url: string; source: string }[] = [];

      if (linkedInJobsResponse.ok) {
        const data = await linkedInJobsResponse.json();
        const results = data.organic || [];
        console.log(`[Careers] Found ${results.length} LinkedIn job results`);

        for (const result of results) {
          if (result.link?.includes('linkedin.com')) {
            allJobListings.push({
              title: result.title || 'Job Listing',
              url: result.link,
              source: 'LinkedIn',
            });
          }
        }
      }

      // ========== STEP 2: Search Indeed ==========
      console.log(`[Careers] Step 2: Searching Indeed...`);
      await delay(1500);

      const indeedResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" jobs site:indeed.com`,
          num: 10,
        }),
      });

      if (indeedResponse.ok) {
        const data = await indeedResponse.json();
        const results = data.organic || [];
        console.log(`[Careers] Found ${results.length} Indeed results`);

        for (const result of results) {
          if (result.link?.includes('indeed.com')) {
            allJobListings.push({
              title: result.title || 'Job Listing',
              url: result.link,
              source: 'Indeed',
            });
          }
        }
      }

      // ========== STEP 3: Search Glassdoor ==========
      console.log(`[Careers] Step 3: Searching Glassdoor...`);
      await delay(1500);

      const glassdoorResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" jobs site:glassdoor.com`,
          num: 10,
        }),
      });

      if (glassdoorResponse.ok) {
        const data = await glassdoorResponse.json();
        const results = data.organic || [];
        console.log(`[Careers] Found ${results.length} Glassdoor results`);

        for (const result of results) {
          if (result.link?.includes('glassdoor.com')) {
            allJobListings.push({
              title: result.title || 'Job Listing',
              url: result.link,
              source: 'Glassdoor',
            });
          }
        }
      }

      // ========== STEP 4: Search company careers page ==========
      if (domain) {
        console.log(`[Careers] Step 4: Checking company careers page...`);
        await delay(1500);

        const careersResponse = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: `site:${domain} careers OR jobs OR "open positions"`,
            num: 5,
          }),
        });

        if (careersResponse.ok) {
          const data = await careersResponse.json();
          const results = data.organic || [];
          console.log(`[Careers] Found ${results.length} company careers page results`);

          for (const result of results) {
            allJobListings.push({
              title: result.title || 'Careers Page',
              url: result.link,
              source: 'Company Website',
            });
          }
        }
      }

      console.log(`[Careers] Total job listings found: ${allJobListings.length}`);

      // ========== STEP 5: Verify at least some job listings exist ==========
      if (allJobListings.length > 0) {
        console.log(`[Careers] Step 5: Verifying job listings...`);
        await delay(1000);

        let verifiedCount = 0;
        const verifiedListings: typeof allJobListings = [];

        for (const listing of allJobListings.slice(0, 5)) {
          console.log(`[Careers] Verifying: ${listing.url}`);
          const isValid = await verifyUrl(listing.url);

          if (isValid) {
            verifiedCount++;
            verifiedListings.push(listing);
            console.log(`[Careers] VERIFIED: ${listing.source} - ${listing.title}`);
          }
          await delay(500);

          if (verifiedCount >= 3) break; // Enough verification
        }

        if (verifiedCount > 0) {
          activeJobsFound = true;
          jobCount = allJobListings.length;
          metadata.jobListings = verifiedListings;
          metadata.totalFound = allJobListings.length;
          metadata.verified = verifiedCount;
        }
      }

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
      ? `${jobCount} listings found (${metadata.verified} verified)`
      : (apiAvailable ? 'No verified listings found' : 'API key required'),
    source: 'Multiple job boards + verification',
    category: 'operational',
    points: activeJobsFound ? 4 : 0,
    maxPoints: 4,
  });

  const duration = Date.now() - startTime;
  console.log(`[Careers] Complete in ${duration}ms - Found: ${activeJobsFound}, Count: ${jobCount}`);

  return {
    signals,
    metadata,
    errors,
    duration,
  };
}
