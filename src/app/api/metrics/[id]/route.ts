import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateMetricInput } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateMetricInput = await request.json();

    // Check if metric exists and period is not finalised
    const metric = await prisma.metric.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    const updated = await prisma.metric.update({
      where: { id },
      data: {
        value: body.value !== undefined ? body.value : undefined,
        isNA: body.isNA !== undefined ? body.isNA : undefined,
        naReason: body.naReason !== undefined ? body.naReason : undefined,
        insight: body.insight !== undefined ? body.insight : undefined,
        hidden: body.hidden !== undefined ? body.hidden : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating metric:', error);
    return NextResponse.json({ error: 'Failed to update metric' }, { status: 500 });
  }
}

