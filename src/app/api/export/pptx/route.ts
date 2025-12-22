import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePPTX } from '@/lib/export/pptx';
import { calculateTrend } from '@/lib/trends';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodId = searchParams.get('periodId');

    if (!periodId) {
      return NextResponse.json({ error: 'periodId is required' }, { status: 400 });
    }

    const period = await prisma.reportingPeriod.findUnique({
      where: { id: periodId },
      include: {
        metrics: {
          orderBy: { metricNumber: 'asc' },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Get tolerances and historical periods for trends
    const [tolerances, historicalPeriods] = await Promise.all([
      prisma.toleranceBand.findMany(),
      prisma.reportingPeriod.findMany({
        where: { isFinalised: true, id: { not: periodId } },
        include: { metrics: true },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    // Calculate trends
    const metricsWithData = period.metrics
      .filter(metric => !metric.hidden && !metric.isNA)
      .map(metric => {
        const tolerance = tolerances.find(t => t.metricNumber === metric.metricNumber);
        const trend = calculateTrend(metric.metricNumber, period, historicalPeriods, tolerance ?? null);
        return {
          ...metric,
          tolerance,
          trend,
        };
      });

    // Get dashboard config
    const config = await prisma.dashboardConfig.findUnique({
      where: { id: 'config' },
    });

    const pptxBuffer = await generatePPTX(period, metricsWithData, config?.headerText || 'Cyber Security Reporting - Period');
    const pptxBody = new Uint8Array(pptxBuffer);

    return new NextResponse(pptxBody, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="metrics-${period.label}.pptx"`,
      },
    });
  } catch (error) {
    console.error('Error generating PPTX:', error);
    return NextResponse.json({ error: 'Failed to generate PPTX' }, { status: 500 });
  }
}

