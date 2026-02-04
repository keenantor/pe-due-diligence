import { z } from 'zod';

// URL validation schema
export const urlSchema = z.string().refine(
  (val) => {
    try {
      const url = normalizeUrl(val);
      return !!url;
    } catch {
      return false;
    }
  },
  { message: 'Please enter a valid website URL' }
);

// Normalize URL to ensure consistent format
export function normalizeUrl(input: string): string {
  let url = input.trim().toLowerCase();

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Add https:// if no protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Upgrade http to https
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }

  // Validate it's a proper URL
  try {
    const parsed = new URL(url);
    // Return just the origin (protocol + host)
    return parsed.origin;
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    // Remove www. prefix if present
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

// Extract a clean company name from domain
export function domainToCompanyName(domain: string): string {
  // Remove TLD
  const withoutTld = domain.split('.')[0];

  // Convert kebab-case or snake_case to spaces
  const withSpaces = withoutTld
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  // Capitalize first letter of each word
  return withSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Check if URL is potentially a company website (not social media, etc.)
export function isCompanyWebsite(url: string): boolean {
  const domain = extractDomain(url);
  const socialDomains = [
    'facebook.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'instagram.com',
    'youtube.com',
    'tiktok.com',
    'pinterest.com',
    'reddit.com',
    'github.com',
    'medium.com',
  ];

  return !socialDomains.some(social => domain.includes(social));
}

// Generate a simple job ID
export function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `scan_${timestamp}_${random}`;
}
