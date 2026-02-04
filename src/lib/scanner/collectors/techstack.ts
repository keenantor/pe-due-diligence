import { Signal, CollectorResult, CollectorContext } from '../types';

interface TechSignature {
  name: string;
  category: string;
  patterns: {
    html?: RegExp[];
    headers?: Record<string, RegExp>;
    scripts?: RegExp[];
    meta?: { name: string; content: RegExp }[];
  };
}

// Common technology signatures
const TECH_SIGNATURES: TechSignature[] = [
  // Frameworks
  {
    name: 'React',
    category: 'Frontend Framework',
    patterns: {
      html: [/data-reactroot/i, /data-reactid/i, /__NEXT_DATA__/i],
      scripts: [/react\.production\.min\.js/i, /react-dom/i],
    },
  },
  {
    name: 'Vue.js',
    category: 'Frontend Framework',
    patterns: {
      html: [/data-v-[a-f0-9]/i, /id="app"/i],
      scripts: [/vue\.min\.js/i, /vue\.runtime/i],
    },
  },
  {
    name: 'Angular',
    category: 'Frontend Framework',
    patterns: {
      html: [/ng-version/i, /\[ng-/i, /\(ng-/i],
      scripts: [/angular\.min\.js/i, /zone\.js/i],
    },
  },
  {
    name: 'Next.js',
    category: 'Frontend Framework',
    patterns: {
      html: [/__NEXT_DATA__/i, /_next\/static/i],
    },
  },
  {
    name: 'WordPress',
    category: 'CMS',
    patterns: {
      html: [/wp-content/i, /wp-includes/i],
      meta: [{ name: 'generator', content: /WordPress/i }],
    },
  },
  {
    name: 'Shopify',
    category: 'E-commerce',
    patterns: {
      html: [/cdn\.shopify\.com/i, /Shopify\.theme/i],
    },
  },
  {
    name: 'Webflow',
    category: 'Website Builder',
    patterns: {
      html: [/webflow\.com/i, /wf-/i],
    },
  },
  {
    name: 'Squarespace',
    category: 'Website Builder',
    patterns: {
      html: [/static\.squarespace\.com/i, /squarespace-cdn/i],
    },
  },
  // Analytics
  {
    name: 'Google Analytics',
    category: 'Analytics',
    patterns: {
      scripts: [/google-analytics\.com\/analytics\.js/i, /gtag/i, /ga\.js/i],
      html: [/UA-\d+-\d+/i, /G-[A-Z0-9]+/i],
    },
  },
  {
    name: 'Mixpanel',
    category: 'Analytics',
    patterns: {
      scripts: [/mixpanel/i],
    },
  },
  {
    name: 'Segment',
    category: 'Analytics',
    patterns: {
      scripts: [/segment\.com\/analytics\.js/i, /cdn\.segment\.com/i],
    },
  },
  {
    name: 'Hotjar',
    category: 'Analytics',
    patterns: {
      scripts: [/hotjar\.com/i, /static\.hotjar\.com/i],
    },
  },
  // Marketing
  {
    name: 'HubSpot',
    category: 'Marketing',
    patterns: {
      scripts: [/js\.hs-scripts\.com/i, /hubspot/i],
    },
  },
  {
    name: 'Intercom',
    category: 'Customer Support',
    patterns: {
      scripts: [/widget\.intercom\.io/i, /intercom/i],
    },
  },
  {
    name: 'Drift',
    category: 'Customer Support',
    patterns: {
      scripts: [/drift\.com/i, /js\.driftt\.com/i],
    },
  },
  {
    name: 'Zendesk',
    category: 'Customer Support',
    patterns: {
      scripts: [/static\.zdassets\.com/i, /zendesk/i],
    },
  },
  // Performance & CDN
  {
    name: 'Cloudflare',
    category: 'CDN/Security',
    patterns: {
      headers: { server: /cloudflare/i },
      html: [/cdn-cgi/i],
    },
  },
  {
    name: 'Fastly',
    category: 'CDN',
    patterns: {
      headers: { 'x-served-by': /cache-/i, via: /varnish/i },
    },
  },
  // Payment
  {
    name: 'Stripe',
    category: 'Payment',
    patterns: {
      scripts: [/js\.stripe\.com/i],
    },
  },
];

export async function collectTechStackSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { url } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  const detectedTech: string[] = [];
  const detectedCategories: Set<string> = new Set();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiligenceScanner/1.0)',
      },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const html = await response.text();

    // Check each technology signature
    for (const tech of TECH_SIGNATURES) {
      let detected = false;

      // Check HTML patterns
      if (tech.patterns.html) {
        for (const pattern of tech.patterns.html) {
          if (pattern.test(html)) {
            detected = true;
            break;
          }
        }
      }

      // Check script patterns
      if (!detected && tech.patterns.scripts) {
        for (const pattern of tech.patterns.scripts) {
          if (pattern.test(html)) {
            detected = true;
            break;
          }
        }
      }

      // Check header patterns
      if (!detected && tech.patterns.headers) {
        for (const [headerName, pattern] of Object.entries(tech.patterns.headers)) {
          const headerValue = headers[headerName];
          if (headerValue && pattern.test(headerValue)) {
            detected = true;
            break;
          }
        }
      }

      // Check meta patterns
      if (!detected && tech.patterns.meta) {
        for (const metaPattern of tech.patterns.meta) {
          const metaRegex = new RegExp(
            `<meta[^>]*name=["']${metaPattern.name}["'][^>]*content=["']([^"']+)["']`,
            'i'
          );
          const match = html.match(metaRegex);
          if (match && metaPattern.content.test(match[1])) {
            detected = true;
            break;
          }
        }
      }

      if (detected) {
        detectedTech.push(tech.name);
        detectedCategories.add(tech.category);
      }
    }

    metadata.technologies = detectedTech;
    metadata.categories = Array.from(detectedCategories);
  } catch (e) {
    errors.push({
      code: 'TECH_DETECTION_ERROR',
      message: `Tech stack detection failed: ${e}`,
      recoverable: true,
    });
  }

  // Tech stack signal
  const hasIdentifiableTech = detectedTech.length > 0;
  signals.push({
    id: 'tech_stack',
    name: 'Tech Stack Identifiable',
    description: 'Technologies detected on website',
    found: hasIdentifiableTech,
    value: hasIdentifiableTech
      ? detectedTech.slice(0, 5).join(', ') + (detectedTech.length > 5 ? '...' : '')
      : undefined,
    source: 'Tech detection',
    category: 'operational',
    points: hasIdentifiableTech ? 4 : 0,
    maxPoints: 4,
  });

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
