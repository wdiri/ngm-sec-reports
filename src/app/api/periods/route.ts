import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePeriodSchema } from '@/types';
import { METRIC_DEFINITIONS } from '@/lib/domain/metrics';

export async function GET() {
  try {
    const periods = await prisma.reportingPeriod.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });
    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // Validate input with Zod
    const validationResult = CreatePeriodSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }, { status: 400 });
    }

    const { label, startDate, endDate } = validationResult.data;

    // Check if label already exists
    const existing = await prisma.reportingPeriod.findUnique({
      where: { label },
    });

    if (existing) {
      return NextResponse.json({ error: 'Period label already exists' }, { status: 400 });
    }

    // Create period with default metrics
    const period = await prisma.reportingPeriod.create({
      data: {
        label,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metrics: {
          create: METRIC_DEFINITIONS.map(def => ({
            metricNumber: def.number,
            name: def.name,
            description: def.description,
            unit: def.unit,
            value: null,
            isNA: false,
          })),
        },
      },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}

