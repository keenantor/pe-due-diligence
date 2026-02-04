import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function collectSearchSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { companyName, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  // If Serper API key is available, use it
  if (SERPER_API_KEY) {
    try {
      const results = await searchWithSerper(companyName || domain, domain);

      // Third-party mentions
      signals.push({
        id: 'third_party_mentions',
        name: 'Third-Party Mentions',
        description: '3+ mentions excluding company domain',
        found: results.thirdPartyCount >= 3,
        value: `${results.thirdPartyCount} mentions found`,
        source: 'Search engine API',
        category: 'validation',
        points: results.thirdPartyCount >= 3 ? 6 : 0,
        maxPoints: 6,
      });

      // News coverage
      signals.push({
        id: 'news_coverage',
        name: 'News/Press Coverage',
        description: 'News articles mentioning company',
        found: results.newsCount > 0,
        value: results.newsCount > 0 ? `${results.newsCount} articles` : undefined,
        source: 'News search',
        category: 'validation',
        points: results.newsCount > 0 ? 5 : 0,
        maxPoints: 5,
      });

      // Search presence
      signals.push({
        id: 'search_presence',
        name: 'Strong Search Presence',
        description: '10+ search results for company name',
        found: results.totalResults >= 10,
        value: `${results.totalResults} results`,
        source: 'Search engine API',
        category: 'validation',
        points: results.totalResults >= 10 ? 5 : 0,
        maxPoints: 5,
      });

      metadata.searchResults = results;
    } catch (e) {
      errors.push({
        code: 'SERPER_ERROR',
        message: `Search API error: ${e}`,
        recoverable: true,
      });
      // Fall through to basic checks
      addBasicSearchSignals(signals, companyName || domain);
    }
  } else {
    // Basic search detection without API
    addBasicSearchSignals(signals, companyName || domain);
  }

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}

interface SerperResults {
  totalResults: number;
  thirdPartyCount: number;
  newsCount: number;
}

async function searchWithSerper(
  query: string,
  excludeDomain: string
): Promise<SerperResults> {
  // Run all searches in PARALLEL for speed
  const [generalResponse, thirdPartyResponse, newsResponse] = await Promise.all([
    // General search
    fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${query}"`,
        num: 20,
      }),
    }),
    // Third-party search (exclude company domain)
    fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${query}" -site:${excludeDomain}`,
        num: 20,
      }),
    }),
    // News search
    fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `"${query}"`,
        num: 10,
      }),
    }),
  ]);

  const [generalData, thirdPartyData, newsData] = await Promise.all([
    generalResponse.json(),
    thirdPartyResponse.json(),
    newsResponse.json(),
  ]);

  return {
    totalResults: generalData.organic?.length || 0,
    thirdPartyCount: thirdPartyData.organic?.length || 0,
    newsCount: newsData.news?.length || 0,
  };
}

function addBasicSearchSignals(signals: Signal[], companyName: string): void {
  // Without API, we can't accurately measure these, so mark as unknown
  // but don't penalize the score heavily

  signals.push({
    id: 'third_party_mentions',
    name: 'Third-Party Mentions',
    description: '3+ mentions excluding company domain',
    found: false,
    value: 'API key required for accurate detection',
    source: 'Search engine API',
    category: 'validation',
    points: 0,
    maxPoints: 6,
  });

  signals.push({
    id: 'news_coverage',
    name: 'News/Press Coverage',
    description: 'News articles mentioning company',
    found: false,
    value: 'API key required for accurate detection',
    source: 'News search',
    category: 'validation',
    points: 0,
    maxPoints: 5,
  });

  signals.push({
    id: 'search_presence',
    name: 'Strong Search Presence',
    description: '10+ search results for company name',
    found: false,
    value: 'API key required for accurate detection',
    source: 'Search engine API',
    category: 'validation',
    points: 0,
    maxPoints: 5,
  });
}
