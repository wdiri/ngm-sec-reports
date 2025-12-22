import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const period = await prisma.reportingPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    if (period.isFinalised) {
      return NextResponse.json({ error: 'Period is already finalised' }, { status: 400 });
    }

    const finalised = await prisma.reportingPeriod.update({
      where: { id },
      data: {
        isFinalised: true,
        finalisedAt: new Date(),
      },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(finalised);
  } catch (error) {
    console.error('Error finalising period:', error);
    return NextResponse.json({ error: 'Failed to finalise period' }, { status: 500 });
  }
}

