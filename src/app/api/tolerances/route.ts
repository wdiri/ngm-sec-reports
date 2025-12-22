import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const tolerances = await prisma.toleranceBand.findMany({
      orderBy: { metricNumber: 'asc' },
    });
    return NextResponse.json(tolerances);
  } catch (error) {
    console.error('Error fetching tolerances:', error);
    return NextResponse.json({ error: 'Failed to fetch tolerances' }, { status: 500 });
  }
}

