import { Signal, CollectorResult, CollectorContext } from '../types';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

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
      console.log(`[Search] Starting thorough search analysis for: "${searchQuery}"`);

      // ========== STEP 1: Primary search ==========
      console.log(`[Search] Step 1: Running primary search...`);
      await delay(1000);

      const primaryResponse = await fetch('https://google.serper.dev/search', {
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

      let primaryResults: Array<{ link: string; title: string }> = [];

      if (primaryResponse.ok) {
        const data = await primaryResponse.json();
        primaryResults = data.organic || [];
        totalResults = primaryResults.length;
        console.log(`[Search] Primary search returned ${totalResults} results`);
      }

      // ========== STEP 2: Secondary search to cross-reference ==========
      console.log(`[Search] Step 2: Running secondary search for cross-reference...`);
      await delay(1500);

      const secondaryResponse = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} company`,
          num: 20,
        }),
      });

      if (secondaryResponse.ok) {
        const data = await secondaryResponse.json();
        const secondaryResults = data.organic || [];
        console.log(`[Search] Secondary search returned ${secondaryResults.length} results`);

        // Add any new results
        for (const result of secondaryResults) {
          if (!primaryResults.some(r => r.link === result.link)) {
            primaryResults.push(result);
          }
        }
        totalResults = primaryResults.length;
      }

      // ========== STEP 3: Count third-party mentions ==========
      console.log(`[Search] Step 3: Analyzing third-party mentions...`);
      await delay(1000);

      if (domain) {
        const thirdPartyResults = primaryResults.filter(
          r => !r.link.toLowerCase().includes(domain.toLowerCase())
        );
        thirdPartyCount = thirdPartyResults.length;
        console.log(`[Search] Found ${thirdPartyCount} third-party mentions`);

        metadata.thirdPartyMentions = thirdPartyResults.slice(0, 10).map(r => ({
          title: r.title,
          url: r.link,
        }));
      } else {
        thirdPartyCount = totalResults;
      }

      // ========== STEP 4: News search ==========
      console.log(`[Search] Step 4: Searching news coverage...`);
      await delay(1500);

      const newsResponse = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `"${searchQuery}"`,
          num: 15,
        }),
      });

      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        const newsResults = newsData.news || [];
        newsCount = newsResults.length;
        console.log(`[Search] Found ${newsCount} news articles`);

        if (newsCount > 0) {
          metadata.newsArticles = newsResults.slice(0, 10).map((r: { title: string; link: string; date?: string; source?: string }) => ({
            title: r.title,
            url: r.link,
            date: r.date,
            source: r.source,
          }));
        }
      }

      // ========== STEP 5: Additional news search for more coverage ==========
      console.log(`[Search] Step 5: Running additional news search...`);
      await delay(1500);

      const newsResponse2 = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${searchQuery} news announcement`,
          num: 10,
        }),
      });

      if (newsResponse2.ok) {
        const newsData2 = await newsResponse2.json();
        const newsResults2 = newsData2.news || [];

        // Add unique news articles
        const existingUrls = new Set((metadata.newsArticles as Array<{url: string}> || []).map(a => a.url));
        for (const article of newsResults2) {
          if (!existingUrls.has(article.link)) {
            newsCount++;
          }
        }
        console.log(`[Search] Total news articles after additional search: ${newsCount}`);
      }

      metadata.totalSearchResults = totalResults;

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
    value: apiAvailable ? `${thirdPartyCount} verified mentions` : 'API key required',
    source: 'Cross-referenced search results',
    category: 'validation',
    points: thirdPartyCount >= 3 ? 6 : 0,
    maxPoints: 6,
  });

  signals.push({
    id: 'news_coverage',
    name: 'News/Press Coverage',
    description: 'News articles mentioning company',
    found: newsCount > 0,
    value: apiAvailable ? (newsCount > 0 ? `${newsCount} articles found` : 'No coverage found') : 'API key required',
    source: 'News search API',
    category: 'validation',
    points: newsCount > 0 ? 5 : 0,
    maxPoints: 5,
  });

  signals.push({
    id: 'search_presence',
    name: 'Strong Search Presence',
    description: '10+ search results for company name',
    found: totalResults >= 10,
    value: apiAvailable ? `${totalResults} total results` : 'API key required',
    source: 'Search engine analysis',
    category: 'validation',
    points: totalResults >= 10 ? 5 : 0,
    maxPoints: 5,
  });

  const duration = Date.now() - startTime;
  console.log(`[Search] Complete in ${duration}ms - Total: ${totalResults}, ThirdParty: ${thirdPartyCount}, News: ${newsCount}`);

  return {
    signals,
    metadata,
    errors,
    duration,
  };
}
