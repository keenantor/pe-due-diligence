import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Add delay for more reliable API responses
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function collectLinkedInSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain || '';

  let linkedInFound = false;
  let linkedInUrl: string | undefined;
  let foundersFound = false;
  let apiAvailable = !!SERPER_API_KEY;

  if (SERPER_API_KEY && searchQuery) {
    try {
      // Search 1: Find LinkedIn company page
      console.log(`[LinkedIn] Searching for company: "${searchQuery}"`);

      const companyResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} linkedin company page`,
          num: 10,
        }),
      });

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        const results = companyData.organic || [];

        console.log(`[LinkedIn] Got ${results.length} results`);

        // Find any LinkedIn company page in results
        for (const result of results) {
          const link = result.link || '';
          if (link.includes('linkedin.com/company/')) {
            linkedInFound = true;
            linkedInUrl = link;
            metadata.linkedInUrl = link;
            metadata.linkedInTitle = result.title;
            console.log(`[LinkedIn] FOUND company page: ${link}`);
            break;
          }
        }
      }

      // Wait before next request to avoid rate limiting
      await delay(500);

      // Search 2: Find leadership/founders
      console.log(`[LinkedIn] Searching for founders of: "${searchQuery}"`);

      const founderResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} CEO founder linkedin`,
          num: 10,
        }),
      });

      if (founderResponse.ok) {
        const founderData = await founderResponse.json();
        const results = founderData.organic || [];

        console.log(`[LinkedIn] Got ${results.length} founder results`);

        // Find LinkedIn profile pages
        const profiles: { name: string; url: string }[] = [];
        for (const result of results) {
          const link = result.link || '';
          if (link.includes('linkedin.com/in/')) {
            profiles.push({
              name: result.title || 'Unknown',
              url: link,
            });
            if (profiles.length >= 5) break;
          }
        }

        if (profiles.length > 0) {
          foundersFound = true;
          metadata.founderProfiles = profiles;
          console.log(`[LinkedIn] FOUND ${profiles.length} founder profiles`);
        }
      }

    } catch (e) {
      console.error(`[LinkedIn] Error:`, e);
      errors.push({
        code: 'LINKEDIN_SEARCH_ERROR',
        message: `LinkedIn search failed: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      });
    }
  }

  // Build signals
  signals.push({
    id: 'linkedin_company',
    name: 'LinkedIn Company Page',
    description: 'Company has LinkedIn presence',
    found: linkedInFound,
    value: linkedInFound ? linkedInUrl : (apiAvailable ? 'Not found' : 'API key required'),
    source: 'Search engine lookup',
    category: 'leadership',
    points: linkedInFound ? 6 : 0,
    maxPoints: 6,
  });

  signals.push({
    id: 'founders_identifiable',
    name: 'Founders/CEO Identifiable',
    description: 'Leadership names discoverable online',
    found: foundersFound,
    value: foundersFound
      ? `${(metadata.founderProfiles as unknown[])?.length || 0} profile(s) found`
      : (apiAvailable ? 'Not found' : 'API key required'),
    source: 'Search engine lookup',
    category: 'leadership',
    points: foundersFound ? 6 : 0,
    maxPoints: 6,
  });

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

  console.log(`[LinkedIn] Complete - linkedIn: ${linkedInFound}, founders: ${foundersFound}`);

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
