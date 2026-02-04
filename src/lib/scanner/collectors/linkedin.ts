import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function collectLinkedInSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain;

  // LinkedIn company page detection
  let linkedInFound = false;
  let linkedInUrl: string | undefined;
  let foundersFound = false;

  if (SERPER_API_KEY) {
    try {
      // Search for LinkedIn company page
      const companyResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `site:linkedin.com/company "${searchQuery}"`,
          num: 5,
        }),
      });

      const companyData = await companyResponse.json();
      const companyResults = companyData.organic || [];

      linkedInFound = companyResults.some(
        (r: { link: string }) => r.link.includes('linkedin.com/company/')
      );

      if (linkedInFound) {
        linkedInUrl = companyResults.find(
          (r: { link: string }) => r.link.includes('linkedin.com/company/')
        )?.link;
        metadata.linkedInUrl = linkedInUrl;
      }

      // Search for founders/leadership on LinkedIn
      const founderResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}" (founder OR CEO OR "co-founder") site:linkedin.com/in`,
          num: 10,
        }),
      });

      const founderData = await founderResponse.json();
      const founderResults = founderData.organic || [];

      foundersFound = founderResults.length > 0;
      if (foundersFound) {
        metadata.founderProfiles = founderResults.slice(0, 3).map(
          (r: { title: string; link: string }) => ({
            name: r.title,
            url: r.link,
          })
        );
      }
    } catch (e) {
      errors.push({
        code: 'LINKEDIN_SEARCH_ERROR',
        message: `LinkedIn search failed: ${e}`,
        recoverable: true,
      });
    }
  } else {
    // Without API, we can try a basic check
    // This is limited but better than nothing
    try {
      // We can't directly scrape LinkedIn, but we can indicate the limitation
      linkedInFound = false;
      foundersFound = false;
    } catch {
      // Expected - just mark as not found
    }
  }

  // LinkedIn company page signal
  signals.push({
    id: 'linkedin_company',
    name: 'LinkedIn Company Page',
    description: 'Company has LinkedIn presence',
    found: linkedInFound,
    value: linkedInUrl,
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
      : SERPER_API_KEY
        ? 'Not found'
        : 'API key required',
    source: 'Search engine lookup',
    category: 'leadership',
    points: foundersFound ? 6 : 0,
    maxPoints: 6,
  });

  // Employee count - this would need LinkedIn API or scraping
  // For now, we mark it as unknown without scraping
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
