import { Signal, CollectorResult, CollectorContext } from '../types';
import { WEBSITE_PATHS, CONTACT_PATTERNS } from '../constants';

export async function collectWebsiteSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { url, domain } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  // Check website reachability
  const websiteReachable = await checkUrl(url);
  signals.push({
    id: 'website_reachable',
    name: 'Website Reachable',
    description: 'Company website returns HTTP 200 status',
    found: websiteReachable,
    value: websiteReachable ? 'HTTP 200 OK' : 'Not reachable',
    source: 'HTTP request',
    category: 'identity',
    points: websiteReachable ? 5 : 0,
    maxPoints: 5,
  });

  if (!websiteReachable) {
    // If website not reachable, mark all website-dependent signals as not found
    return {
      signals: addMissingWebsiteSignals(signals),
      metadata,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // Fetch homepage content for analysis
  let homepageContent = '';
  let homepageTitle = '';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiligenceScanner/1.0)',
      },
    });
    homepageContent = await response.text();

    // Extract title
    const titleMatch = homepageContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      homepageTitle = titleMatch[1].trim();
      // Try to extract company name from title
      const cleanTitle = homepageTitle
        .replace(/\s*[\-|–|—|:]\s*.*(home|homepage|welcome|official).*/i, '')
        .replace(/\s*[\-|–|—|:]\s*$/,'')
        .trim();
      if (cleanTitle && cleanTitle.length < 50) {
        metadata.companyName = cleanTitle;
      }
    }
  } catch (e) {
    errors.push({
      code: 'FETCH_ERROR',
      message: `Failed to fetch homepage: ${e}`,
      recoverable: true,
    });
  }

  // Check for about page
  const aboutPageExists = await checkPaths(url, WEBSITE_PATHS.about);
  signals.push({
    id: 'about_page',
    name: 'About Page Exists',
    description: 'Company has an about/company page',
    found: aboutPageExists,
    source: 'Website crawl',
    category: 'identity',
    points: aboutPageExists ? 4 : 0,
    maxPoints: 4,
  });

  // Check for contact information
  const { hasContact, contactValue } = extractContactInfo(homepageContent, url);
  signals.push({
    id: 'contact_info',
    name: 'Contact Information',
    description: 'Email or phone contact available',
    found: hasContact,
    value: contactValue,
    source: 'Website crawl',
    category: 'identity',
    points: hasContact ? 4 : 0,
    maxPoints: 4,
  });

  // Check for physical location
  const hasLocation = checkForLocation(homepageContent);
  signals.push({
    id: 'physical_location',
    name: 'Physical Location',
    description: 'Address or headquarters location stated',
    found: hasLocation,
    source: 'Website crawl',
    category: 'identity',
    points: hasLocation ? 4 : 0,
    maxPoints: 4,
  });

  // Check for privacy policy
  const privacyExists = await checkPaths(url, WEBSITE_PATHS.privacy);
  signals.push({
    id: 'privacy_policy',
    name: 'Privacy Policy',
    description: 'Privacy policy page exists',
    found: privacyExists,
    source: 'Website crawl',
    category: 'identity',
    points: privacyExists ? 2 : 0,
    maxPoints: 2,
  });

  // Check for team page
  const teamPageExists = await checkPaths(url, WEBSITE_PATHS.team);
  signals.push({
    id: 'team_page',
    name: 'Team Page Exists',
    description: 'Website has team or leadership page',
    found: teamPageExists,
    source: 'Website crawl',
    category: 'leadership',
    points: teamPageExists ? 4 : 0,
    maxPoints: 4,
  });

  // Check for careers page
  const careersPageExists = await checkPaths(url, WEBSITE_PATHS.careers);
  signals.push({
    id: 'careers_page',
    name: 'Careers Page Exists',
    description: 'Company has careers/jobs page',
    found: careersPageExists,
    source: 'Website crawl',
    category: 'operational',
    points: careersPageExists ? 4 : 0,
    maxPoints: 4,
  });

  // Check for case studies/testimonials
  const caseStudiesExist = await checkPaths(url, WEBSITE_PATHS.caseStudies);
  const hasCustomers = homepageContent.toLowerCase().includes('customer') ||
    homepageContent.toLowerCase().includes('trusted by') ||
    homepageContent.toLowerCase().includes('used by');
  signals.push({
    id: 'case_studies',
    name: 'Case Studies/Testimonials',
    description: 'Customer success stories present',
    found: caseStudiesExist || hasCustomers,
    source: 'Website crawl',
    category: 'validation',
    points: caseStudiesExist || hasCustomers ? 5 : 0,
    maxPoints: 5,
  });

  // Check for partnerships
  const partnersPageExists = await checkPaths(url, WEBSITE_PATHS.partners);
  const hasPartners = homepageContent.toLowerCase().includes('partner') ||
    homepageContent.toLowerCase().includes('integration');
  signals.push({
    id: 'partnerships',
    name: 'Partnership Mentions',
    description: 'Partner logos or text on website',
    found: partnersPageExists || hasPartners,
    source: 'Website crawl',
    category: 'validation',
    points: partnersPageExists || hasPartners ? 4 : 0,
    maxPoints: 4,
  });

  // Check for blog/content
  const blogExists = await checkPaths(url, WEBSITE_PATHS.blog);
  signals.push({
    id: 'blog_present',
    name: 'Blog/Content Present',
    description: 'Blog or news section exists',
    found: blogExists,
    source: 'Website crawl',
    category: 'operational',
    points: blogExists ? 3 : 0,
    maxPoints: 3,
  });

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiligenceScanner/1.0)',
      },
    });
    return response.ok;
  } catch {
    // Try GET as fallback (some servers don't support HEAD)
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DiligenceScanner/1.0)',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

async function checkPaths(baseUrl: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    const fullUrl = `${baseUrl}${path}`;
    const exists = await checkUrl(fullUrl);
    if (exists) {
      return true;
    }
  }
  return false;
}

function extractContactInfo(
  content: string,
  url: string
): { hasContact: boolean; contactValue?: string } {
  // Check for email
  const emailMatches = content.match(CONTACT_PATTERNS.email);
  const validEmails = emailMatches?.filter((email) => {
    // Filter out common non-contact emails
    const lower = email.toLowerCase();
    return !lower.includes('example') &&
      !lower.includes('placeholder') &&
      !lower.includes('@sentry') &&
      !lower.includes('@webpack');
  });

  if (validEmails && validEmails.length > 0) {
    return { hasContact: true, contactValue: validEmails[0] };
  }

  // Check for phone
  const phoneMatches = content.match(CONTACT_PATTERNS.phone);
  if (phoneMatches && phoneMatches.length > 0) {
    return { hasContact: true, contactValue: phoneMatches[0] };
  }

  // Check if contact page exists (we'll check this separately)
  return { hasContact: false };
}

function checkForLocation(content: string): boolean {
  const locationIndicators = [
    'headquarter',
    'headquarters',
    'hq',
    'office',
    'offices',
    'located in',
    'based in',
    'address',
  ];

  const lowerContent = content.toLowerCase();

  // Check for location keywords
  const hasLocationKeyword = locationIndicators.some((indicator) =>
    lowerContent.includes(indicator)
  );

  // Check for address pattern
  const hasAddressPattern = CONTACT_PATTERNS.address.test(content);

  // Check for schema.org location data
  const hasSchemaLocation =
    content.includes('"@type":"PostalAddress"') ||
    content.includes('"@type":"Place"') ||
    content.includes('itemtype="http://schema.org/PostalAddress"');

  return hasLocationKeyword || hasAddressPattern || hasSchemaLocation;
}

function addMissingWebsiteSignals(signals: Signal[]): Signal[] {
  const websiteSignalIds = [
    'about_page',
    'contact_info',
    'physical_location',
    'privacy_policy',
    'team_page',
    'careers_page',
    'case_studies',
    'partnerships',
    'blog_present',
  ];

  const existingIds = new Set(signals.map((s) => s.id));

  for (const id of websiteSignalIds) {
    if (!existingIds.has(id)) {
      signals.push({
        id,
        name: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: 'Website not accessible',
        found: false,
        source: 'Website crawl',
        category: getSignalCategory(id),
        points: 0,
        maxPoints: getSignalMaxPoints(id),
      });
    }
  }

  return signals;
}

function getSignalCategory(id: string): Signal['category'] {
  const categoryMap: Record<string, Signal['category']> = {
    about_page: 'identity',
    contact_info: 'identity',
    physical_location: 'identity',
    privacy_policy: 'identity',
    team_page: 'leadership',
    careers_page: 'operational',
    case_studies: 'validation',
    partnerships: 'validation',
    blog_present: 'operational',
  };
  return categoryMap[id] || 'identity';
}

function getSignalMaxPoints(id: string): number {
  const pointsMap: Record<string, number> = {
    about_page: 4,
    contact_info: 4,
    physical_location: 4,
    privacy_policy: 2,
    team_page: 4,
    careers_page: 4,
    case_studies: 5,
    partnerships: 4,
    blog_present: 3,
  };
  return pointsMap[id] || 0;
}
