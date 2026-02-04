import { NextRequest, NextResponse } from 'next/server';
import { generateAIInterpretation } from '@/lib/scanner/ai/interpreter';
import { ScanResult } from '@/lib/scanner/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scanResult = body.result as ScanResult;

    if (!scanResult) {
      return NextResponse.json(
        { error: 'Scan result is required' },
        { status: 400 }
      );
    }

    const interpretation = await generateAIInterpretation(scanResult);

    if (!interpretation) {
      return NextResponse.json(
        { error: 'Failed to generate interpretation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ interpretation });
  } catch (error) {
    console.error('Interpret error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
