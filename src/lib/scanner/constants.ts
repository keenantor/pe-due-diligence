import { SignalDefinition, SignalCategory } from './types';

// All signal definitions with their scoring values
export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  // Company Identity (max 25 points)
  {
    id: 'website_reachable',
    name: 'Website Reachable',
    description: 'Company website returns HTTP 200 status',
    category: 'identity',
    points: 5,
    source: 'HTTP request',
  },
  {
    id: 'about_page',
    name: 'About Page Exists',
    description: 'Company has an about/company page',
    category: 'identity',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'contact_info',
    name: 'Contact Information',
    description: 'Email or phone contact available',
    category: 'identity',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'physical_location',
    name: 'Physical Location',
    description: 'Address or headquarters location stated',
    category: 'identity',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'domain_age',
    name: 'Domain Age > 2 Years',
    description: 'Domain registered for at least 2 years',
    category: 'identity',
    points: 4,
    source: 'WHOIS/RDAP lookup',
  },
  {
    id: 'ssl_valid',
    name: 'SSL Certificate Valid',
    description: 'Website has valid TLS/SSL certificate',
    category: 'identity',
    points: 2,
    source: 'TLS connection',
  },
  {
    id: 'privacy_policy',
    name: 'Privacy Policy',
    description: 'Privacy policy page exists',
    category: 'identity',
    points: 2,
    source: 'Website crawl',
  },

  // Management & Leadership (max 20 points)
  {
    id: 'linkedin_company',
    name: 'LinkedIn Company Page',
    description: 'Company has LinkedIn presence',
    category: 'leadership',
    points: 6,
    source: 'Search engine lookup',
  },
  {
    id: 'founders_identifiable',
    name: 'Founders/CEO Identifiable',
    description: 'Leadership names discoverable online',
    category: 'leadership',
    points: 6,
    source: 'Search engine lookup',
  },
  {
    id: 'team_page',
    name: 'Team Page Exists',
    description: 'Website has team or leadership page',
    category: 'leadership',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'employee_count',
    name: 'Employee Count Available',
    description: 'Employee range discoverable',
    category: 'leadership',
    points: 4,
    source: 'LinkedIn or website',
  },

  // Market & External Validation (max 25 points)
  {
    id: 'third_party_mentions',
    name: 'Third-Party Mentions',
    description: '3+ mentions excluding company domain',
    category: 'validation',
    points: 6,
    source: 'Search engine API',
  },
  {
    id: 'case_studies',
    name: 'Case Studies/Testimonials',
    description: 'Customer success stories present',
    category: 'validation',
    points: 5,
    source: 'Website crawl',
  },
  {
    id: 'partnerships',
    name: 'Partnership Mentions',
    description: 'Partner logos or text on website',
    category: 'validation',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'news_coverage',
    name: 'News/Press Coverage',
    description: 'News articles mentioning company',
    category: 'validation',
    points: 5,
    source: 'News search',
  },
  {
    id: 'search_presence',
    name: 'Strong Search Presence',
    description: '10+ search results for company name',
    category: 'validation',
    points: 5,
    source: 'Search engine API',
  },

  // Operational Signals (max 15 points)
  {
    id: 'careers_page',
    name: 'Careers Page Exists',
    description: 'Company has careers/jobs page',
    category: 'operational',
    points: 4,
    source: 'Website crawl',
  },
  {
    id: 'active_jobs',
    name: 'Active Job Listings',
    description: 'Open positions on job boards',
    category: 'operational',
    points: 4,
    source: 'Job board search',
  },
  {
    id: 'tech_stack',
    name: 'Tech Stack Identifiable',
    description: 'Technologies detected on website',
    category: 'operational',
    points: 4,
    source: 'Tech detection',
  },
  {
    id: 'blog_present',
    name: 'Blog/Content Present',
    description: 'Blog or news section exists',
    category: 'operational',
    points: 3,
    source: 'Website crawl',
  },
];

// Penalty definitions (0 to -15 total)
export const PENALTY_DEFINITIONS = [
  {
    id: 'no_leadership',
    name: 'No Leadership Identifiable',
    description: 'No founders, team page, or LinkedIn leaders found',
    points: -5,
  },
  {
    id: 'website_only',
    name: 'Website-Only Footprint',
    description: 'No third-party mentions detected',
    points: -5,
  },
  {
    id: 'no_social',
    name: 'No Social Presence',
    description: 'No LinkedIn or social profiles found',
    points: -3,
  },
  {
    id: 'new_domain',
    name: 'Very New Domain',
    description: 'Domain less than 1 year old',
    points: -2,
  },
];

// Category metadata
export const CATEGORY_INFO: Record<SignalCategory, { name: string; maxScore: number; description: string }> = {
  identity: {
    name: 'Company Identity',
    maxScore: 25,
    description: 'Basic company information and web presence',
  },
  leadership: {
    name: 'Management & Leadership',
    maxScore: 20,
    description: 'Executive team and organizational structure visibility',
  },
  validation: {
    name: 'Market & External Validation',
    maxScore: 25,
    description: 'Third-party mentions, customers, and market presence',
  },
  operational: {
    name: 'Operational Signals',
    maxScore: 15,
    description: 'Hiring activity, technology, and operational indicators',
  },
};

// Pages to check on websites
export const WEBSITE_PATHS = {
  about: ['/about', '/about-us', '/company', '/who-we-are'],
  contact: ['/contact', '/contact-us', '/get-in-touch'],
  team: ['/team', '/leadership', '/about/team', '/people', '/our-team'],
  careers: ['/careers', '/jobs', '/work-with-us', '/join-us', '/open-positions'],
  caseStudies: ['/case-studies', '/customers', '/success-stories', '/clients'],
  blog: ['/blog', '/news', '/insights', '/resources', '/articles'],
  privacy: ['/privacy', '/privacy-policy', '/legal/privacy'],
  terms: ['/terms', '/tos', '/terms-of-service', '/legal/terms'],
  partners: ['/partners', '/integrations', '/ecosystem'],
};

// Patterns for detecting contact information
export const CONTACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
  address: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)[,.\s]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/gi,
};

// Static disclaimer text
export const DISCLAIMER_TEXT = `This tool provides an automated assessment of publicly available information only. The coverage score reflects the discoverability of public signals and does NOT constitute financial, legal, or investment advice.

Key limitations:
• Automated checks may miss information that requires human interpretation
• Third-party data sources may be incomplete or outdated
• A high score does not guarantee company legitimacy or financial health
• A low score may reflect limited public disclosure rather than risk

This tool is intended to help prioritize due diligence efforts and should never replace comprehensive professional investigation. Always conduct thorough independent research before making investment decisions.

Results are provided "as-is" without warranty. By using this tool, you acknowledge these limitations.`;
