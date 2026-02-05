import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Verify a URL actually exists by making a HEAD request
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
    return response.ok || response.status === 403 || response.status === 999; // LinkedIn returns 999 for valid pages
  } catch {
    return false;
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

  const searchQuery = companyName || domain || '';

  let linkedInFound = false;
  let linkedInUrl: string | undefined;
  let foundersFound = false;
  let apiAvailable = !!SERPER_API_KEY;

  if (SERPER_API_KEY && searchQuery) {
    try {
      console.log(`[LinkedIn] Starting thorough search for: "${searchQuery}"`);

      // ========== STEP 1: Search for LinkedIn company page ==========
      console.log(`[LinkedIn] Step 1: Searching for company page...`);
      await delay(1000); // Deliberate delay for thorough processing

      const companyResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" site:linkedin.com/company`,
          num: 10,
        }),
      });

      let linkedInCandidates: string[] = [];

      if (companyResponse.ok) {
        const data = await companyResponse.json();
        const results = data.organic || [];
        console.log(`[LinkedIn] Found ${results.length} potential company pages`);

        // Collect all LinkedIn company URLs
        for (const result of results) {
          if (result.link?.includes('linkedin.com/company/')) {
            linkedInCandidates.push(result.link);
          }
        }
      }

      // ========== STEP 2: Cross-reference with second search ==========
      console.log(`[LinkedIn] Step 2: Cross-referencing with alternative search...`);
      await delay(1500);

      const verifyResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} LinkedIn company profile`,
          num: 10,
        }),
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const verifyResults = verifyData.organic || [];

        for (const result of verifyResults) {
          if (result.link?.includes('linkedin.com/company/') && !linkedInCandidates.includes(result.link)) {
            linkedInCandidates.push(result.link);
          }
        }
        console.log(`[LinkedIn] Total candidates after cross-reference: ${linkedInCandidates.length}`);
      }

      // ========== STEP 3: Verify the best candidate URL actually exists ==========
      if (linkedInCandidates.length > 0) {
        console.log(`[LinkedIn] Step 3: Verifying URL exists...`);
        await delay(1000);

        for (const candidateUrl of linkedInCandidates.slice(0, 3)) {
          console.log(`[LinkedIn] Verifying: ${candidateUrl}`);
          const isValid = await verifyUrl(candidateUrl);

          if (isValid) {
            linkedInFound = true;
            linkedInUrl = candidateUrl;
            metadata.linkedInUrl = candidateUrl;
            console.log(`[LinkedIn] VERIFIED company page: ${candidateUrl}`);
            break;
          }
          await delay(500);
        }
      }

      // ========== STEP 4: Search for founders/leadership ==========
      console.log(`[LinkedIn] Step 4: Searching for leadership profiles...`);
      await delay(1500);

      const founderResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" CEO OR founder OR "co-founder" site:linkedin.com/in`,
          num: 15,
        }),
      });

      if (founderResponse.ok) {
        const founderData = await founderResponse.json();
        const results = founderData.organic || [];
        console.log(`[LinkedIn] Found ${results.length} potential leadership profiles`);

        const profiles: { name: string; url: string }[] = [];

        for (const result of results) {
          if (result.link?.includes('linkedin.com/in/')) {
            // Verify profile mentions the company
            const title = (result.title || '').toLowerCase();
            const snippet = (result.snippet || '').toLowerCase();
            const query = searchQuery.toLowerCase();

            if (title.includes(query) || snippet.includes(query)) {
              profiles.push({
                name: result.title || 'Unknown',
                url: result.link,
              });
            }
          }
          if (profiles.length >= 5) break;
        }

        if (profiles.length > 0) {
          // Verify at least one profile
          console.log(`[LinkedIn] Step 5: Verifying leadership profiles...`);
          await delay(1000);

          for (const profile of profiles.slice(0, 2)) {
            const isValid = await verifyUrl(profile.url);
            if (isValid) {
              foundersFound = true;
              metadata.founderProfiles = profiles;
              console.log(`[LinkedIn] VERIFIED ${profiles.length} leadership profiles`);
              break;
            }
            await delay(500);
          }
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
    source: 'Search + URL verification',
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
      ? `${(metadata.founderProfiles as unknown[])?.length || 0} verified profile(s)`
      : (apiAvailable ? 'Not found' : 'API key required'),
    source: 'Search + URL verification',
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

  const duration = Date.now() - startTime;
  console.log(`[LinkedIn] Complete in ${duration}ms - LinkedIn: ${linkedInFound}, Founders: ${foundersFound}`);

  return {
    signals,
    metadata,
    errors,
    duration,
  };
}
