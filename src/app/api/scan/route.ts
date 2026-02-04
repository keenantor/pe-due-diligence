import { NextRequest, NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';
import { normalizeUrl, generateJobId } from '@/lib/utils/url';

// Configure for longer timeout on Vercel
export const maxDuration = 60; // 60 seconds max

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, includeAI = true } = body;

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

    const jobId = generateJobId();

    // Run scan synchronously (required for serverless)
    const result = await runScan({
      url: normalizedUrl,
      includeAI,
      onProgress: () => {}, // Progress not used in sync mode
    });

    return NextResponse.json({
      jobId,
      status: 'completed',
      result,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        status: 'failed'
      },
      { status: 500 }
    );
  }
}
