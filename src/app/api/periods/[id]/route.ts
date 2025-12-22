import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const period = await prisma.reportingPeriod.findUnique({
      where: { id },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error fetching period:', error);
    return NextResponse.json({ error: 'Failed to fetch period' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const period = await prisma.reportingPeriod.findUnique({ where: { id } });
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    await prisma.reportingPeriod.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting draft period:', error);
    return NextResponse.json({ error: 'Failed to delete draft period' }, { status: 500 });
  }
}

