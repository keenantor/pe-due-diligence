import { NextRequest, NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';
import { normalizeUrl, extractDomain, generateJobId } from '@/lib/utils/url';

// In-memory store for scan jobs (replace with Redis/KV in production)
const scanJobs = new Map<
  string,
  {
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    result?: unknown;
    error?: { code: string; message: string };
    createdAt: string;
    updatedAt: string;
  }
>();

// Clean up old jobs periodically (simple garbage collection)
function cleanupOldJobs() {
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  for (const [jobId, job] of scanJobs.entries()) {
    const createdTime = new Date(job.createdAt).getTime();
    if (now - createdTime > maxAge) {
      scanJobs.delete(jobId);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, includeAI = false } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize and validate URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const domain = extractDomain(normalizedUrl);
    const jobId = generateJobId();

    // Clean up old jobs
    cleanupOldJobs();

    // Create job entry
    scanJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      currentStep: 'Initializing...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Run scan asynchronously
    runScanAsync(jobId, normalizedUrl, includeAI);

    return NextResponse.json({
      jobId,
      status: 'processing',
      estimatedTime: 30,
      pollUrl: `/api/scan/${jobId}`,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function runScanAsync(jobId: string, url: string, includeAI: boolean) {
  try {
    const result = await runScan({
      url,
      includeAI,
      onProgress: (progress, step) => {
        const job = scanJobs.get(jobId);
        if (job) {
          job.progress = progress;
          job.currentStep = step;
          job.updatedAt = new Date().toISOString();
        }
      },
    });

    const job = scanJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Complete';
      job.result = result;
      job.updatedAt = new Date().toISOString();
    }
  } catch (error) {
    console.error('Scan failed:', error);
    const job = scanJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = {
        code: 'SCAN_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      job.updatedAt = new Date().toISOString();
    }
  }
}

// Export the jobs map for the status endpoint
export { scanJobs };
