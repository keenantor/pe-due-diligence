import { NextRequest, NextResponse } from 'next/server';
import { scanJobs } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = scanJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    result: job.status === 'completed' ? job.result : undefined,
    error: job.status === 'failed' ? job.error : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
