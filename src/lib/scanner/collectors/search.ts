import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// Add delay for more reliable API responses
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function collectSearchSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const searchQuery = companyName || domain || '';
  let totalResults = 0;
  let thirdPartyCount = 0;
  let newsCount = 0;
  let apiAvailable = !!SERPER_API_KEY;

  if (SERPER_API_KEY && searchQuery) {
    try {
      // Search 1: General search for company mentions
      console.log(`[Search] Searching for: "${searchQuery}"`);

      const generalResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}"`,
          num: 30,
        }),
      });

      if (generalResponse.ok) {
        const data = await generalResponse.json();
        const results = data.organic || [];
        totalResults = results.length;

        console.log(`[Search] Got ${totalResults} general results`);

        // Count third-party mentions (not from company's own domain)
        if (domain) {
          thirdPartyCount = results.filter(
            (r: { link: string }) => !r.link.toLowerCase().includes(domain.toLowerCase())
          ).length;
          console.log(`[Search] Third-party mentions: ${thirdPartyCount}`);
        } else {
          thirdPartyCount = totalResults;
        }

        metadata.searchResults = results.slice(0, 10).map((r: { title: string; link: string }) => ({
          title: r.title,
          url: r.link,
        }));
      }

      // Wait before next request
      await delay(500);

      // Search 2: News search
      console.log(`[Search] Searching news for: "${searchQuery}"`);

      const newsResponse = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}"`,
          num: 10,
        }),
      });

      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        const newsResults = newsData.news || [];
        newsCount = newsResults.length;

        console.log(`[Search] Got ${newsCount} news results`);

        if (newsCount > 0) {
          metadata.newsArticles = newsResults.slice(0, 5).map((r: { title: string; link: string; date?: string }) => ({
            title: r.title,
            url: r.link,
            date: r.date,
          }));
        }
      }

    } catch (e) {
      console.error(`[Search] Error:`, e);
      errors.push({
        code: 'SEARCH_ERROR',
        message: `Search failed: ${e instanceof Error ? e.message : String(e)}`,
        recoverable: true,
      });
    }
  }

  // Build signals
  signals.push({
    id: 'third_party_mentions',
    name: 'Third-Party Mentions',
    description: '3+ mentions excluding company domain',
    found: thirdPartyCount >= 3,
    value: apiAvailable ? `${thirdPartyCount} mentions found` : 'API key required',
    source: 'Search engine API',
    category: 'validation',
    points: thirdPartyCount >= 3 ? 6 : 0,
    maxPoints: 6,
  });

  signals.push({
    id: 'news_coverage',
    name: 'News/Press Coverage',
    description: 'News articles mentioning company',
    found: newsCount > 0,
    value: apiAvailable ? (newsCount > 0 ? `${newsCount} articles` : 'No coverage found') : 'API key required',
    source: 'News search',
    category: 'validation',
    points: newsCount > 0 ? 5 : 0,
    maxPoints: 5,
  });

  signals.push({
    id: 'search_presence',
    name: 'Strong Search Presence',
    description: '10+ search results for company name',
    found: totalResults >= 10,
    value: apiAvailable ? `${totalResults} results` : 'API key required',
    source: 'Search engine API',
    category: 'validation',
    points: totalResults >= 10 ? 5 : 0,
    maxPoints: 5,
  });

  console.log(`[Search] Complete - total: ${totalResults}, thirdParty: ${thirdPartyCount}, news: ${newsCount}`);

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
