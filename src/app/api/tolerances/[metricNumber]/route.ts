import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdateToleranceSchema } from '@/types';
import { del, CacheKeys } from '@/lib/cache';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ metricNumber: string }> }
) {
  try {
    const { metricNumber } = await params;
    const metricNum = parseInt(metricNumber, 10);

    if (isNaN(metricNum) || metricNum < 1 || metricNum > 11) {
      return NextResponse.json({ error: 'Invalid metric number' }, { status: 400 });
    }

    const rawBody = await request.json();

    // Validate input with Zod
    const validationResult = UpdateToleranceSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }, { status: 400 });
    }

    const body = validationResult.data;

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

    // Invalidate cache
    await del(CacheKeys.toleranceBands);
    await del(CacheKeys.toleranceBand(metricNum));

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating tolerance:', error);
    return NextResponse.json({ error: 'Failed to update tolerance' }, { status: 500 });
  }
}

