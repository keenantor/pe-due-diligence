import { Signal, CollectorResult, CollectorContext } from '../types';

export async function collectDomainSignals(
  context: CollectorContext
): Promise<CollectorResult> {
  const { domain, url } = context;
  const startTime = Date.now();
  const signals: Signal[] = [];
  const metadata: Record<string, unknown> = {};
  const errors: CollectorResult['errors'] = [];

  // Check domain age via RDAP (free, no API key required)
  let domainAge: number | null = null;
  let domainAgeValue: string | undefined;

  try {
    const rdapResponse = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (rdapResponse.ok) {
      const rdapData = await rdapResponse.json();

      // Extract creation date from events
      const events = rdapData.events || [];
      const registrationEvent = events.find(
        (e: { eventAction: string }) =>
          e.eventAction === 'registration' || e.eventAction === 'creation'
      );

      if (registrationEvent?.eventDate) {
        const creationDate = new Date(registrationEvent.eventDate);
        const now = new Date();
        domainAge = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

        if (domainAge >= 2) {
          domainAgeValue = `${Math.floor(domainAge)} years`;
        } else if (domainAge >= 1) {
          domainAgeValue = `${Math.floor(domainAge * 12)} months`;
        } else {
          domainAgeValue = `< 1 year (${Math.floor(domainAge * 12)} months)`;
        }

        metadata.domainAge = domainAge;
        metadata.creationDate = registrationEvent.eventDate;
      }
    }
  } catch (e) {
    errors.push({
      code: 'RDAP_ERROR',
      message: `RDAP lookup failed: ${e}`,
      recoverable: true,
    });
  }

  // Domain age signal
  const isDomainOldEnough = domainAge !== null && domainAge >= 2;
  signals.push({
    id: 'domain_age',
    name: 'Domain Age > 2 Years',
    description: 'Domain registered for at least 2 years',
    found: isDomainOldEnough,
    value: domainAgeValue || (domainAge !== null ? 'Unable to determine' : undefined),
    source: 'WHOIS/RDAP lookup',
    category: 'identity',
    points: isDomainOldEnough ? 4 : 0,
    maxPoints: 4,
  });

  // Check SSL certificate
  let sslValid = false;
  let sslValue: string | undefined;

  try {
    // Simple SSL check by trying HTTPS connection
    const sslResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiligenceScanner/1.0)',
      },
    });

    if (sslResponse.ok && url.startsWith('https://')) {
      sslValid = true;
      sslValue = 'Valid HTTPS';
      metadata.sslValid = true;
    }
  } catch (e) {
    // If HTTPS fails, SSL is not valid
    sslValid = false;
    sslValue = 'Invalid or missing';
  }

  signals.push({
    id: 'ssl_valid',
    name: 'SSL Certificate Valid',
    description: 'Website has valid TLS/SSL certificate',
    found: sslValid,
    value: sslValue,
    source: 'TLS connection',
    category: 'identity',
    points: sslValid ? 2 : 0,
    maxPoints: 2,
  });

  return {
    signals,
    metadata,
    errors,
    duration: Date.now() - startTime,
  };
}
