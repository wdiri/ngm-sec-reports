import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ metricNumber: string }> }
) {
  try {
    const { metricNumber } = await params;
    const metricNum = parseInt(metricNumber, 10);
    const body = await request.json();

    const updated = await prisma.toleranceBand.update({
      where: { metricNumber: metricNum },
      data: {
        greenMin: body.greenMin !== undefined ? body.greenMin : undefined,
        greenMax: body.greenMax !== undefined ? body.greenMax : undefined,
        greenOperator: body.greenOperator,
        amberMin: body.amberMin !== undefined ? body.amberMin : undefined,
        amberMax: body.amberMax !== undefined ? body.amberMax : undefined,
        amberOperator: body.amberOperator,
        redMin: body.redMin !== undefined ? body.redMin : undefined,
        redMax: body.redMax !== undefined ? body.redMax : undefined,
        redOperator: body.redOperator,
        isLowerBetter: body.isLowerBetter !== undefined ? body.isLowerBetter : undefined,
        flatTolerance: body.flatTolerance !== undefined ? body.flatTolerance : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating tolerance:', error);
    return NextResponse.json({ error: 'Failed to update tolerance' }, { status: 500 });
  }
}

