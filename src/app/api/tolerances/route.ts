import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { get, set, CacheKeys } from '@/lib/cache';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = await get<any[]>(CacheKeys.toleranceBands);
    if (cached) {
      return NextResponse.json(cached);
    }

    // If not in cache, fetch from database
    const tolerances = await prisma.toleranceBand.findMany({
      orderBy: { metricNumber: 'asc' },
    });

    // Cache for 1 hour (tolerance bands rarely change)
    await set(CacheKeys.toleranceBands, tolerances, 3600);

    return NextResponse.json(tolerances);
  } catch (error) {
    console.error('Error fetching tolerances:', error);
    return NextResponse.json({ error: 'Failed to fetch tolerances' }, { status: 500 });
  }
}

